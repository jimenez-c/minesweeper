gulp = require 'gulp'
$ = require('gulp-load-plugins')()
browserSync = require('browser-sync')
reload = browserSync.reload

global.browser_support = [
    "ie >= 9"
    "ie_mob >= 10"
    "ff >= 30"
    "chrome >= 34"
    "safari >= 7"
    "opera >= 23"
    "ios >= 7"
    "android >= 4.4"
    "bb >= 10"
]

gulp.task 'serve', ->
  browserSync
    notify: false
    port: 8080
    server:
      baseDir: './'
  gulp.watch '*.slim', ['slim']
  gulp.watch 'assets/coffeescript/*.coffee', ['coffee']
  gulp.watch 'assets/sass/*.sass', ['sass']

gulp.task 'slim', ->
  gulp.src '*.slim'
  .pipe $.plumber()
  .pipe $.slim pretty: true
  .pipe gulp.dest '.'
  .pipe reload(stream: true)

gulp.task 'sass', ->
  gulp.src 'assets/sass/*.sass'
  .pipe $.plumber()
  .pipe $.sass
    indentedSyntax: true
    onError: console.error.bind(console, 'SASS Error:')
  .pipe $.autoprefixer(browsers: browser_support)
  .pipe gulp.dest('dist/css/')
  .pipe $.size()
  .pipe reload(stream: true)

gulp.task 'coffee', ->
  gulp.src 'assets/coffeescript/*.coffee'
  .pipe $.plumber()
  .pipe $.coffeeify()
  .pipe gulp.dest('dist/js/')
  .pipe reload(stream: true)

gulp.task 'default', ['serve']
