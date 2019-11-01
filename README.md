# gulp-html-assets-extract

`gulp-html-assets-extract` 是构建于gulp之上的一款思想超前的插件。它的工作方式类似于webpack和rollup的 **tree shaking** —— 以HTML文件作为输入，提取出文档中有用的资源，pipe下去做进一步处理

## 重要更新日志
- ## 1.1.1 -更新Demo案例（演示如何使用gulp-filter过滤未被标记文件，以及如何搭配lazypipe和gulp.parallel使gulp执行速度大幅提升！！）
- ## 1.1.0 -在之前的1.0.x版本中，插件没有提取未用`/start:xx/`和`/end/`包裹住的资源，该逻辑目前已修正。在这次版本更新后，使用者可以正确得到文件中引用的所有css和js资源了！

## 安装

使用Node的包管理工具[NPM](https://www.npmjs.com/)来安装该插件。

```bash
npm install gulp-html-assets-extract -D
```

## gulp-html-assets-extract是怎样炼成的?
机缘巧合之下，我接手了一个项目，需要配合安卓和iOS端开发Webview页面。该项目采用原生html+css+js，没有使用任何前端框架，也没有打包工具。\
一开始我打算采用webpack进行打包，但webpack与传统开发模式并不契合，配置起来也较困难，我便将目光投向了gulp。\
一开始还算顺利，但慢慢地一个问题暴露了出来 —— 以前我们借助三大框架及webpack，可以打包我们项目真正需要的资源(Tree Shaking)，以及对JS和CSS文件做合并压缩处理。但当我们使用html+gulp的时候，这点却很难实现。为什么呢？原因很简单，gulp的功能依托于插件，而在浩瀚如林的gulp插件中，并没有能实现类似于webpack这种打包机制的插件，于是我便动手自己开发了一个。

## gulp-html-assets-extract有什么独特之处?
&emsp;&emsp;gulp-html-assets-extract以HTML文件作为输入！它寻找文件中做了标记的资源引用，将标记的引用合并成一个文件，未做标记的资源，作为独立的文件，pipe 给下面的插件做进一步处理

## gulp-html-assets-extract的使用场景?
所有以HTML而非JS文件作为入口的开发场景(其实就是不借助三大框架的传统开发模式)

## gulp-html-assets-extract的工作方式?
&emsp;&emsp;上文提到gulp-html-assets-extract会在html文件中寻找**标记**。那什么是标记呢？其实这是本插件事先定义好的HTML文档特殊注释（在w3c规范的HTML注释`<!--  -->`中间加上`/start:xxx/`或`/end/`，如`<!-- /start:demo.js/ -->`）gulp-html-assets-extract 会从注释包裹的内容中提取资源路径，根据路径将文件内容从磁盘读出来后合成一个文件 `pipe` 下去。\
**Q：** 为什么要用注释的方式来提取资源呢？\
**A：** 原因有以下几点：\
① HTML中可能引用了第三方的js和css，这类型的资源可能做好了优化处理。如果再把它们拿出来进行二次加工，将会导致加工时间的增长以及潜在的错误。怎样规避这类问题呢？只要将它们置于标记外即可\
② 如果一个注释里包含了多个css或js资源，插件是会将它们从磁盘中读取出来并合并为一个文件的。这时候就面对一个问题了，合并后的文件它叫什么，放于什么位置？为了让插件更灵活，插件采用这种方式将选择权交给了读者，让读者充分DIY（`<!-- /start:xxx/ -->`中的`xxx`就包含了合并后生成文件的位置和名称。如`<!-- /start:path/to/folder/foo.js/ -->`就会生成`foo.js`文件，放于`path`目录下的`to`文件夹下的`folder`文件夹内）。\
③ 增加页面的可重塑性 —— 用户可以自行决定哪些资源需要作为一组进行合并，哪些作为另一组进行合并

## gulp-html-assets-extract的优势
说了这么多，gulp-html-assets-extract 到底有哪些优点呢
- **简单** - 只需注释就可实现一站式功能
- **灵活** - 用户可在页面内充分DIY
- **高效** - 高性能的正则匹配
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
const lazypipe = require('lazypipe')

gulp.task('html-assets-extract',function(){
  // 感叹号开头，过滤掉文件路径中包含lib文件夹的所有js文件
  const jsFilter = filter(['**/*.js', '!**/lib/**'])
  // 感叹号开头，过滤掉文件路径中包含lib文件夹的所有css文件
  const cssFilter = filter(['**/*.css', '!**/lib/**'])
  const htmlFilter = filter("**/*.html")
  const readSrc = () => gulp.src("./src/**/*.html",{base: 'src'});
  // 初始化一个lazypipe
  const assetsPipe = lazypipe().pipe(readSrc).pipe(htmlAssets)();
  // html文件处理函数，函数体根据自身需求定义
  function html(cb){
    assetsPipe.pipe(htmlFilter).pipe(htmlmin(htmlMinOptions)).pipe(gulp.dest(devPath.buildPath));
    cb();
  }
  // js文件处理函数，函数体根据自身需求定义
  function js(cb){
    assetsPipe.pipe(jsFilter).pipe(babel({presets: ['@babel/env']}))
    .pipe(uglify())
    .pipe(gulp.dest(devPath.buildPath))
    cb()
  }
  // css文件处理函数，函数体根据自身需求定义
  function css(cb){
    assetsPipe.pipe(cssFilter).pipe(cleanCSS())
    .pipe(autoprefixer({
      overrideBrowserslist: ['Android 4.1', 'iOS 7.1', 'Chrome > 31', 'ff > 31', 'ie >= 8'],
      grid: true,
    }))
    .pipe(gulp.dest(devPath.buildPath))
    cb();
  }
  // 并列执行html,js和css三个任务，执行时间大幅缩短
  gulp.parallel(html,js,css)(cb)
})
```
以上第一个是html文件，第二个是`gulpfile.js`配置文件

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
const jsFilter = filter(['**/*.js', '!**/lib/**'])
const cssFilter = filter(['**/*.css', '!**/lib/**'])
const htmlFilter = filter("**/*.html")
  ```
以上三句代码通过gulp-filter来创建了三种不同的过滤器，分别可以过滤得到HTML文件，文件路径中不包括lib文件夹的CSS文件以及文件路径中不包括lib文件夹的JS文件。
```js
gulp.src("./src/**/*.html", {base: './src'})
```
`gulp.src` 是 gulp读取文件的方式。**需要注意的是我们应该指定`base`选项。** 否则文件路径很可能出错
```js
gulp.parallel(html,js,css)(cb)
```
在`gulp.task`和`gulp.parallel`的回调函数别忘记`cb`的调用（具体参考上例）

## 注意事项
1. 注释标签前后各有一个空格，请严格遵守`<!--(这里有一个空格)/start:文件名/(这里有一个空格)-->`、`<!--(这里有一个空格)/end/(这里有一个空格)-->`
2. 理解`base`这个概念很重要，如果还不是很清楚的话，可以参考node和gulp的官方文档（这里先举一个简单的例子：当你书写诸如`<link rel="stylesheet" href="/css/style1.css" />`和`<script src="/js/test.js"></script>`时，你的 **`/`** 指的是什么目录，那么`base`就是什么目录）


## 反馈
在插件使用过程中如遇到问题可向作者反馈(939774876@qq.com)\
如果觉得好用的话可向身边的人推广或[给个星](https://github.com/FranklyCai/gulp-html-assets-extract)

## 许可证
[MIT](https://choosealicense.com/licenses/mit/)