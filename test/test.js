var browserify = require('../')

var test = require('tape')
var through2 = require('through2')
var vfs = require('vinyl-fs')
var uglify = require('gulp-uglify')
var sourcemaps = require('gulp-sourcemaps')
var concat = require('concat-stream')

var path = require('path')

var fixtureRoot = path.join(__dirname, 'fixture')

test('browserify.src() creates vinyl stream of bundled scripts', function (t) {

  browserify.src(fixtureRoot + '/foo.js').pipe(through2.obj(function (file, _, callback) {
    t.ok(file.isBuffer(), 'The file is buffer')

    var bundledScript = file.contents.toString()

    t.ok(/This is foo\.js/.test(bundledScript), 'The file contains foo.js')
    t.ok(/This is bar\/baz\.js/.test(bundledScript), 'The file contains bar/baz.js')

    t.end()
  }))

})

test('browserify.src() throws when the given paths are invalid', function (t) {
  t.doesNotThrow(function () { browserify.src('./src/**/*.js') }, './src/**/*.js is valid')
  t.doesNotThrow(function () { browserify.src(['./src/**/*.js']) }, '["./src/**/*.js"] is valid')
  t.throws(function () { browserify.src(null) }, 'null is invalid')
  t.throws(function () { browserify.src('') }, 'an empty string is invalid')
  t.throws(function () { browserify.src([]) }, 'an empty array is invalid')

  t.end()
})

test('browserify.src() emits error when unable to bundle script', function (t) {
  browserify.src(fixtureRoot + '/error.js').on('error', function (err) {
    t.ok(err instanceof Error, 'It emits error instance')
    t.end()
  })
})

test('browserify.src({passthrough: true, ...vinylOpts}) works as a transform stream', function (t) {

  vfs.src(fixtureRoot + '/foo.js')
    .pipe(browserify.src({debug: true, passthrough: true}))
    .pipe(through2.obj(function (file, enc, callback) {
      t.ok(file.isBuffer(), 'The file is buffer type')

      var contents = file.contents.toString()

      t.ok(/This is foo\.js/.test(contents), 'The file contains foo.js')
      t.ok(/This is bar\/baz\.js/.test(contents), 'The file contains bar/baz/js')

      t.end()
    }))

})

test('browserify.src(paths, {passthrough: true, ...options}) works as transform stream and adds entries to it from the given paths', function (t) {

  var result = {}

  vfs.src(fixtureRoot + '/foo.js')
    .pipe(browserify.src(fixtureRoot + '/ham.js', {debug: true, passthrough: true}))
    .pipe(through2.obj(function (file, enc, callback) {

      result[path.basename(file.path)] = file.contents.toString()
      callback(null, file)

    })).on('finish', function () {

      t.equal(Object.keys(result).length, 2)

      t.ok(/This is foo\.js/.test(result['foo.js']), 'foo.js bundle include foo.js')
      t.ok(/This is bar\/baz\.js/.test(result['foo.js']), 'foo.js bundle include bar/baz.js')
      t.ok(/This is ham\.js/.test(result['ham.js']), 'ham.js bundle include ham.js')
      t.ok(/This is bar\/baz\.js/.test(result['ham.js']), 'ham.js bundle include bar/baz.js')

      t.end()
    })
})

test('when buffer option is false, file.contents is a stream', function (t) {

  browserify.src(fixtureRoot + '/foo.js', {buffer: false}).pipe(through2.obj(function (file, enc, callback) {

    t.ok(file.isStream(), 'The file is stream type')
    t.end()

  }))

})

test('when sourcemaps option is true, the output has sourcemaps', function (t) {
  browserify
    .src(fixtureRoot + '/foo.js', {sourcemaps: true})
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(through2.obj(function (file, enc, callback) {

      t.ok(file.isBuffer(), 'The file is buffer type')

      var contents = file.contents.toString()

      t.ok(/This is foo\.js/.test(contents), 'The file contains foo.js')
      t.ok(/This is bar\/baz\.js/.test(contents), 'The file contains bar/baz/js')
      t.ok(/sourceMappingURL=/.test(contents), 'The file contains source maps')

      t.end()

    }))
})

test('since option filters the files by its mtime', function (t) {
  t.plan(4)

  browserify.src(fixtureRoot + '/foo.js', {since: new Date()}).pipe(concat({object: true}, function (arr) {
    t.equal(arr.length, 0)
  }))

  browserify.src(fixtureRoot + '/foo.js', {since: 0}).pipe(concat({object: true}, function (arr) {
    t.equal(arr.length, 1)
  }))

  browserify.src(fixtureRoot + '/foo.js', {since: Number(0)}).pipe(concat({object: true}, function (arr) {
    t.equal(arr.length, 1)
  }))

  t.throws(function () {
    browserify.src(fixtureRoot + '/foo.js', {since: '2016-11-11'})
  }, 'string type is invalid for `since` option')

})

test('works with uglify', function (t) {

  browserify.src(fixtureRoot + '/foo.js').pipe(uglify()).pipe(through2.obj(function (file, enc, callback) {
    t.ok(file.isBuffer(), 'The file is buffer type')

    var contents = file.contents.toString()

    t.ok(/This is foo\.js/.test(contents), 'The file contains foo.js')
    t.ok(/This is bar\/baz\.js/.test(contents), 'The file contains bar/baz/js')

    t.end()
  }))

})

test('works with sourcemaps', function (t) {

  browserify
    .src(fixtureRoot + '/foo.js', {debug: true})
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(through2.obj(function (file, enc, callback) {

      t.ok(file.isBuffer(), 'The file is buffer type')

      var contents = file.contents.toString()

      t.ok(/This is foo\.js/.test(contents), 'The file contains foo.js')
      t.ok(/This is bar\/baz\.js/.test(contents), 'The file contains bar/baz/js')
      t.ok(/sourceMappingURL=/.test(contents), 'The file contains source maps')

      t.end()

    }))

})
