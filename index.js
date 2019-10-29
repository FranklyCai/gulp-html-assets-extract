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
const vinylPathResolve = function(file,assetName){
  if (assetName.startsWith('/')) {
    return path.join(file.base, assetName);
  } else return path.join(file.dirname, assetName);
}
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
    const toReplace = {};
    const injectReg = /<!--\s\/start:([\S]+)\/\s-->([\s\S]+?)<!-- \/end\/ -->/g;
    const commentReg = /<!--[\s\S]+?-->/g;
    const cssSrc = /<link\s{1}[^>]*?href=(["'])([^>"']+)\1[^>]*>/g;
    const scriptSrc = /<script\s{1}[^>]*?src=(["'])([^>"']+)\1[^>]*><\/script>/g;
    while ((match = injectReg.exec(contents))) {
      const wholeMatchContent = match[0];
      const assetName = match[1];
      const matchContent = match[2].trim();
      let assetContent = '';
      if (match[2].search(/<!--\s\/start:([\S]+)\/\s-->/) != -1) {
        logMessage('资源提取标记不允许交叉出现<!-- /start:***/ --><!-- /end/ -->', file, match);
        break;
      }
      const commentsArr = [];
      while ((match = commentReg.exec(matchContent))) {
        const startIndex = match.index,
          len = match[0].length,
          endIndex = startIndex + len - 1;
        commentsArr.push({ startIndex, endIndex });
      }
      while ((match = cssSrc.exec(matchContent))) {
        let isComment = false;
        for (let i = 0; i < commentsArr.length; i++) {
          if (commentsArr[i].startIndex < match.index && match.index < commentsArr[i].endIndex) {
            isComment = true;
            break;
          }
        }
        if (isComment) continue;
        let cssName = pathResolve(match, file);
        if (!cssName) continue;
        let cssContents;
        try {
          cssContents = fs.readFileSync(cssName);
        } catch (error) {
          console.log(error);
          if (error.code == 'ENOENT') {
            logMessage('找不到该资源', file, match);
          }
          continue;
        }
        assetContent += cssContents + '\r\n';
      }
      while ((match = scriptSrc.exec(matchContent))) {
        let isComment = false;
        for (let i = 0; i < commentsArr.length; i++) {
          if (commentsArr[i].startIndex < match.index && match.index < commentsArr[i].endIndex) {
            isComment = true;
            break;
          }
        }
        if (isComment) continue;
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
        assetContent += scriptContents + '\r\n';
      }
      if (assetContent) {
        this.push(
          new Vinyl({
            base: file.base,
            path: vinylPathResolve(file, assetName),
            contents: Buffer.from(assetContent),
          })
        );
        toReplace[assetName] = wholeMatchContent;
      }
    }
    Object.entries(toReplace).forEach(entry => {
      const assetName = entry[0];
      const ext = assetName.substring(assetName.lastIndexOf('.') + 1);
      const tagName =
        ext == 'js' ? `<script src="${assetName}"></script>` : `<link rel="stylesheet" href="${assetName}">`;
      contents = contents.replace(entry[1], tagName);
    });
    file.contents = Buffer.from(contents);
    callback(null, file);
  });
module.exports = plugin;
