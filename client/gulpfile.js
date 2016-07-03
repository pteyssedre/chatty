var gulp = require('gulp'),
    WebServer = require('gulp-webserver');

gulp.task('WebServer', function() {
    gulp.src('')
        .pipe(WebServer({
            livereload: true,
            open: true
        }));
});

gulp.task('default', ['WebServer']);