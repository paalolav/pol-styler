'use strict';

const gulp = require('gulp');
const { exec } = require('child_process');
const build = require('@microsoft/sp-build-web');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

// Define the lint task using ESLint directly
gulp.task('lint', (cb) => {
  exec('npx eslint "src/**/*.{ts,tsx}"', (err, stdout, stderr) => {
    console.log(stdout); // Print standard output
    console.error(stderr); // Print standard error
    if (err) {
      console.error('Linting failed with errors.');
    }
    cb(err); // Pass the error to Gulp
  });
});

build.initialize(gulp);
