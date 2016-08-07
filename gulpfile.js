"use strict";

var gulp = require('gulp');
var sync = require('browser-sync').create();

gulp.task("build", function() {
	var stream = gulp.src("app/**/**")
	.pipe(sync.reload({
		stream: true
	}));
	return stream;
});

gulp.task("watch", function() {
	gulp.watch("app/**", ["build"]);
});

gulp.task("sync", function() {
	sync.init({
		server: {
			baseDir: "app"
		}
	});
});

gulp.task("watch", ["sync", "build"], function() {
	gulp.watch(["app/**/**"], ["build"]);
});
