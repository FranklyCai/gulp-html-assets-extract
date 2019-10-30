var through = require('through2');
var path = require('path');
var fs = require('fs');
var Vinyl = require('vinyl');
var PluginError = require('plugin-error');
var chalk = require('chalk');
const pluginName = 'gulp-html-assets-extract';
const logMessage = function(title, file, match) {
  console.log(
    chalk.magenta(
      chalk.black.bgGreen(`${pluginName}:`),
      chalk.cyan(`${title}`),
      `${file.path}`,
      chalk.green(`>>>>>`),
      `${match[0]}`
    )
  );
};
const pathResolve = function(match, file) {
  if (match[2].startsWith('http://') || match[2].startsWith('https://')) {
    logMessage('远端引用不做处理', file, match);
  } else if (match[2].startsWith('/')) {
    return path.join(file.base, match[2]);
  } else return path.join(file.dirname, match[2]);
};
const vinylPathResolve = function(file, assetName) {
  if (assetName.startsWith('/')) {
    return path.join(file.base, assetName);
  } else return path.join(file.dirname, assetName);
};
const markReg = /<!-- \/start:([\S]+)\/ -->([\s\S]+?)<!-- \/end\/ -->/g;
const markStartReg = /^<!--\s\/start:([\S]+)\/\s-->$/;
const markEndReg = /^<!-- \/end\/ -->$/;
const commentReg = /<!--[\s\S]+?-->/g;
const cssSrc = /<link\s{1}[^>]*?href=(["'])([^>"']+)\1[^>]*>/g;
const scriptSrc = /<script\s{1}[^>]*?src=(["'])([^>"']+)\1[^>]*><\/script>/g;
const matchComment = [];
const assetInfo = [];
const plugin = () =>
  through.obj(function(file, encoding, callback) {
    if (file.isNull()) {
      callback(null, file);
      return;
    }
    if (file.isStream()) {
      callback(new PluginError(pluginName, '流目前暂不支持'));
      return;
    }
    let contents = file.contents.toString();
    let deCommentStr = contents.replace(commentReg, function(match, offset) {
      if (markStartReg.test(match) || markEndReg.test(match)) {
        return match;
      }
      const length = match.length;
      const index = offset;
      matchComment.push({
        index,
        length,
        content: match,
      });
      return match.replace(/./g, ' ');
    });
    while ((match = markReg.exec(deCommentStr))) {
      const wholeMatchContent = match[0];
      const assetName = match[1];
      const matchContent = match[2].trim();
      let assetContent = '';
      if (match[2].search(/<!--\s\/start:([\S]+)\/\s-->/) != -1) {
        logMessage('资源提取标记不允许交叉出现<!-- /start:***/ --><!-- /end/ -->', file, match);
        break;
      }
      let hasAsset = false;
      while ((match = cssSrc.exec(matchContent))) {
        let cssName = pathResolve(match, file);
        if (!cssName) continue;
        let cssContents;
        try {
          cssContents = fs.readFileSync(cssName);
        } catch (error) {
          if (error.code == 'ENOENT') {
            logMessage('找不到该资源', file, match);
          }
          continue;
        }
        hasAsset = true;
        assetContent += cssContents + '\r\n';
      }
      while ((match = scriptSrc.exec(matchContent))) {
        let scriptName = pathResolve(match, file);
        if (!scriptName) continue;
        let scriptContents;
        try {
          scriptContents = fs.readFileSync(scriptName);
        } catch (error) {
          if (error.code == 'ENOENT') {
            logMessage('找不到该资源', file, match);
          }
          continue;
        }
        hasAsset = true;
        assetContent += scriptContents + '\r\n';
      }
      if (hasAsset) {
        this.push(
          new Vinyl({
            base: file.base,
            path: vinylPathResolve(file, assetName),
            contents: Buffer.from(assetContent),
          })
        );
        deCommentStr = deCommentStr.replace(wholeMatchContent, wholeMatchContent.replace(/./g, ' '));
        assetInfo.push({
          path: assetName,
          content: wholeMatchContent,
        });
      }
    }
    while ((match = scriptSrc.exec(deCommentStr))) {
      let assetPath = pathResolve(match, file);
      if (!assetPath) continue;
      let content;
      try {
        content = fs.readFileSync(assetPath);
      } catch (error) {
        if (error.code == 'ENOENT') {
          logMessage('找不到该资源', file, match);
        }
        continue;
      }
      this.push(
        new Vinyl({
          base: file.base,
          path: vinylPathResolve(file, match[2]),
          contents: Buffer.from(content),
        })
      );
    }
    while ((match = cssSrc.exec(deCommentStr))) {
      let assetPath = pathResolve(match, file);
      if (!assetPath) continue;
      let content;
      try {
        content = fs.readFileSync(assetPath);
      } catch (error) {
        if (error.code == 'ENOENT') {
          logMessage('找不到该资源', file, match);
        }
        continue;
      }
      this.push(
        new Vinyl({
          base: file.base,
          path: vinylPathResolve(file, match[2]),
          contents: Buffer.from(content),
        })
      );
    }
    assetInfo.forEach(info=>{
      const assetPath = info.path;
      const ext = assetPath.substring(assetPath.lastIndexOf('.') + 1);
      const tagName =
        ext == 'js' ? `<script src="${assetPath}"></script>` : `<link rel="stylesheet" href="${assetPath}">`;
      contents = contents.replace(info.content, tagName);
    })
    file.contents = Buffer.from(contents);
    callback(null, file);
  });
module.exports = plugin;
