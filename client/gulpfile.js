var gulp = require('gulp'),
    WebServer = require('gulp-webserver');

gulp.task('WebServer', function() {
    gulp.src('')
        .pipe(WebServer({
            host:'0.0.0.0',
            livereload: false,
            open: true
        }));
});

gulp.task('default', ['WebServer']);