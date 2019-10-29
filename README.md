# gulp-html-assets-extract

`gulp-html-assets-extract` 是构建于gulp之上的一款思想超前的插件。它的工作方式类似于Webpack和Rollup的 `Tree Shaking` —— 以HTML文件作为输入，提取出有用的资源，以做进一步处理

## 安装

使用Node的包管理工具[NPM](https://www.npmjs.com/)来安装该插件。

```bash
npm install gulp-html-assets-extract -D
```

## gulp-html-assets-extract是怎样炼成的?
机缘巧合之下，我接手了一个项目，需要配合安卓和iOS端开发Webview页面。该项目采用原生html+css+js，没有使用任何前端框架，也没有打包工具。\
一开始我打算采用webpack进行打包，但webpack与传统开发模式并不契合（毕竟webpack不是为了这个目的而诞生的），配置起来较困难，于是我将目光投向了gulp。\
一开始还算顺利，但慢慢地一个问题被暴露了出来 —— 以往我们借助于三大框架及webpack，我们可以打包我们项目需要的资源(Tree Shaking)，以及对JS和CSS文件做合并压缩处理。但当我们使用html+gulp这种技术栈的时候，发现这点很难实现。为什么呢？原因很简单，gulp的功能依托于插件，而在浩瀚如林的gulp插件中，并没有能实现类似于webpack这种打包机制的插件。\
没办法，只能自己开发一个了。

## gulp-html-assets-extract的使用场景?
**所有以传统方式进行前端开发的场景（可以是Hybrid App，Webview 或 Web App等等）**

## gulp-html-assets-extract有什么独特之处?
&emsp;&emsp;gulp-html-assets-extract是以HTML文件作为输入的。它会寻找文件中做了标记的资源引用，将标记在一起的资源引用作为一个文件单位提取出来，`pipe` 给其它插件做进一步处理。（目前该插件仅支持html,css和js资源的提取，若读者有其它需求，可联系作者对功能进行扩展）然后在HTML文件中给以简单的注释，以让gulp-html-assets-extract能正确提取你感兴趣的那部分文件做进一步处理。


## gulp-html-assets-extract的工作方式?
&emsp;&emsp;上文提到gulp-html-assets-extract会在html文件中寻找**标记**。那什么是标记呢？其实这是本插件事先定义好的HTML文档特殊注释（在w3c规范的HTML注释`<!--  -->`中间加上`/start:xxx/`或`/end/`，如`<!-- /start:demo.js/ -->`）gulp-html-assets-extract 会从注释包裹的内容中提取资源路径，根据路径将文件内容从磁盘读出来后合成一个文件 `pipe` 下去。\
**Q：** 为什么要用注释的方式来提取资源呢？\
**A：** 原因有以下几点：\
① HTML中可能引用了第三方的js和css，这类型的资源可能已经被做了压缩等处理，如果再把它们拿出来进行二次加工，会导致处理时间的加长及潜在的错误。读者不要将该类型资源包含在注释中即可\
② 如果一个注释里包含了多个css或js资源，插件是会将它们从磁盘中读取出来并合并为一个文件的。这时候就面对一个问题了，合并后的文件它叫什么，放于什么位置？为了让插件更灵活，插件采用这种方式将选择权交给了读者，让读者充分DIY（`<!-- /start:xxx/ -->`中的`xxx`就包含了合并后生成文件的位置和名称。如`<!-- /start:path/to/folder/foo.js/ -->`就会生成`foo.js`文件，放于`path`目录下的`to`文件夹下的`folder`文件夹内）。\
③ 增加插件的灵活性。读者可以自行决定哪些资源需要作为一组进行合并，哪些作为另一组进行合并。

## 插件有哪些亮点
- **简单** - 只需一步注释就可达到你想要的功能
- **灵活** - 用户可自行决定需要合并哪些文件以及合并后的文件名称是什么，文件存放路径是哪
- **高效** - 高性能正则匹配
- **节约** - 以HTML为导向，只专注有用资源，节约时间，节省资源

## Demo
下面提供一个简单的例子：
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <!-- /start:combine.css/ -->
    <link rel="stylesheet" href="/css/style1.css" />
    <link rel="stylesheet" href="/css/style2.css" />
    <!-- /end/ -->
    <title>title</title>
  </head>
  <body>
    <div>nothing</div>
    <!-- /start:combine1.js/ -->
    <script src="./js/test.js"></script>
    <!-- /end/ -->
    <!-- /start:combine2.js/ -->
    <script src="./js/test2.js"></script>
    <script src="./js/test3.js"></script>
    <!-- /end/ -->
  </body>
</html>
```
```js
const extract = require('gulp-html-assets-extract'),
const filter = require('gulp-filter');
const htmlmin = require('gulp-htmlmin');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');

gulp.task('html-assets-extract',function(){
  const jsFilter = filter("**/*.js", {restore:true})
  const cssFilter = filter("**/*.css", {restore:true})
  const htmlFilter = filter("**/*.html", {restore:true})
  return gulp.src("./src/**/*.html", {base: './src'})
  .pipe(extract())
  .pipe(htmlFilter)
  .pipe(htmlmin(htmlMinOptions))
  .pipe(gulp.dest(devPath.buildPath))
  .pipe(htmlFilter.restore)
  .pipe(jsFilter)
  .pipe(uglify())
  .pipe(gulp.dest(devPath.buildPath))
  .pipe(jsFilter.restore)
  .pipe(cssFilter)
  .pipe(autoprefixer({
    overrideBrowserslist: ['Android 4.1', 'iOS 7.1', 'Chrome > 31', 'ff > 31', 'ie >= 8'],
    grid: true,
  }))
  .pipe(cleanCSS())
  .pipe(gulp.dest(devPath.buildPath))
})
```
第一个是html文件，第二个是`gulpfile.js`配置文件

任务执行成功后，html会变成
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <link rel="stylesheet" href="combine.css" />
    <title>title</title>
  </head>
  <body>
    <div>nothing</div>
    <script src="combine1.js"></script>
    <script src="combine2.js"></script>
  </body>
</html>
```
并且在与生成的html文件同级目录下，会看到 `combine.css`、  `combine1.js`、 `combine2.js` 这三个文件

**guilefile.js注释：**
为防止初学者不懂以上配置什么意思，这里特给出注释
```js
const jsFilter = filter("**/*.js", {restore:true})
const cssFilter = filter("**/*.css", {restore:true})
const htmlFilter = filter("**/*.html", {restore:true})
  ```
以上三句代码通过gulp-filter来创建了三种不同的过滤器，分别可以过滤得到HTML，CSS和JS文件。其中，`{restore:true}`这个选项是必加的，不然无法进行之后的`htmlFilter.restore`或`htmlFilter.restore`等操作。
```js
gulp.src("./src/**/*.html", {base: './src'})
```
`gulp.src` 是 gulp读取文件的方式，没什么好说的。**需要注意的是我们最好指定`base`选项。** 为什么呢？因为当我们处理完文件调用`gulp.dest`将文件写入磁盘中时，gulp会根据这个`base`指定的目录作为相对路径来创建对应的目录结构。什么意思呢？假如你在html文件中这里写注释：`/start:abc/bcd/foo.js/`，那么当gulp将要使用`gulp.dest`将文件写入磁盘内时，文件的路径就会是`{base}/abc/bcd/foo.js`。
```
.pipe(htmlFilter)
.pipe(jsFilter)
.pipe(cssFilter)
```
调用后会分别得到html、js 和 css子集
```
.pipe(htmlFilter.restore)
.pipe(jsFilter.restore)
```
恢复被过滤器过滤掉的文件
```
.pipe(htmlmin(htmlMinOptions))
.pipe(uglify())
.pipe(cleanCSS())
```
对html,js,css文件做相应处理（注意：这里只做演示，需要如何处理使用者可自行调整）

## 注意事项
1. 插件不会对远端资源做处理，如以 `http://` 或 `https://` 开头的资源类型，因为代码本身是通过调用`fs.readFileSync`来读取文件的（那么当碰到这类资源时，插件会在控制台给出提示，告诉你跳过了这个文件）
2. 当`/start:xxx/`和`/end/`标签中出现了嵌套的`/start:xxx/`标签时，插件会给出提示并跳过该html文件（嵌套这种情况在逻辑上亦不合理，使用者应根据控制台提示修改嵌套注释）
3. 注释标签前后各有一个空格，请严格遵守`<!--(这里有一个空格)/start:文件名/(这里有一个空格)-->`
4. 理解`base`这个概念很重要，这样当调用`gulp.dest`的时候文件才会按照希望的那种目录结构输出到dest目录中。如果还不是很清楚的话，可以参考node和gulp的官方文档（这里先举一个简单的例子：当你书写诸如`<link rel="stylesheet" href="/css/style1.css" />`和`<script src="/js/test.js"></script>`时，你的 **`/`** 指的是什么目录，那么`base`就是什么目录）


## 反馈
在插件使用过程中如遇到问题可向作者反馈(939774876@qq.com)\
如果觉得好用的话可向身边的人推广或GitHub点个星

## 许可证
[MIT](https://choosealicense.com/licenses/mit/)