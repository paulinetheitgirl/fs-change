#!/usr/bin/env node
'use strict'; /*jslint node: true, es5: true, indent: 2 */
var _ = require('underscore');
var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var glob = require('glob');
var logger = require('winston');
var path = require('path');

function FileAction(filepath, command_template) {
  this.filepath = filepath;
  // for each file, interpolate its command
  var ctx = {
    file: filepath,
    extname: path.extname(filepath),
    basename: path.basename(filepath, path.extname(filepath)),
    dirname: path.dirname(filepath)
  };
  this.command = command_template.replace(/\{(.+?)\}/g, function(full_match, group_1) {
    return ctx[group_1];
  });
}
FileAction.prototype.start = function() {
  // debounce for a period of 2s, but execute on the immediate end
  this.fs_watcher = fs.watch(this.filepath, _.debounce(this.change.bind(this), 2000, true));
};
FileAction.prototype.stop = function() {
  this.fs_watcher.close();
};
FileAction.prototype.change = function(event, filename) {
  // filename may not actually be supplied
  logger.verbose('Saw ' + event + ' on ' + this.filepath);
  // TODO: check last modified stats?
  // if (curr.mtime.valueOf() != prev.mtime.valueOf() ||
  //   curr.ctime.valueOf() != prev.ctime.valueOf()) {
  logger.info(this.command);
  child_process.exec(this.command, function (err, stdout, stderr) {
    if (err) logger.error(err);
    if (stdout) logger.debug('stdout: ' + stdout);
    if (stderr) logger.debug('stderr: ' + stdout);
  });
};

function readConfig(config_path, callback) {
  // callback signature: function(err, files) - files is an Array of FileAction objects
  logger.info('Reading config: ' + config_path);
  fs.readFile(config_path, 'utf8', function (err, data) {
    if (err) return callback(err);

    var lines = data.trim().split(/\n+/g);
    logger.debug('Globbing ' + lines.length + ' patterns');

    // we have a bunch of globs, we want to flatmap them all to a list of filepaths
    async.map(lines, function(line, callback) {
      var parts = line.match(/^(.+?):(.+)$/);
      var pattern = parts[1].trim();
      var command = parts[2].trim();
      glob(pattern, function(err, filepaths) {
        // for single files, filepaths will just be one file: the exact match
        callback(err, filepaths.map(function(filepath) {
          // zip up each filepath with the command that goes with its glob
          return new FileAction(filepath, command);
        }));
      });
    }, function(err, fileactionss) {
      var fileactions = _.flatten(fileactionss);
      logger.debug('Created ' + fileactions.length + ' FileActions');
      callback(err, fileactions);
    });
  });
}

function install() {
  var app_path = path.join(__dirname, 'FSChange.app');
  // command from http://hints.macworld.com/article.php?story=20111226075701552
  var command = "osascript -e 'tell application \"System Events\" " +
      "to make login item at end with properties " +
      "{path:\"" + app_path + "\", hidden:false}'";

  child_process.exec(command, function (error, stdout, stderr) {
    if (error) {
      logger.error([
        'Install failed: ' + error,
        '  stdout: ' + stdout,
        '  stderr: ' + stderr,
      ].join('\n'));
    }
    else {
      logger.info([
        'Installed Successfully.',
        'To uninstall, go to System Preferences -> ',
        '  Users & Groups -> ',
        '  Login Items -> ',
        '  select "FSChange" and click "-".',
      ].join('\n'));
    }
  });
}

function start(opts) {
  readConfig(opts.config, function(err, file_actions) {
    if (err) {
      logger.error(err.toString());
      process.exit(1);
    }
    else {
      _.invoke(file_actions, 'start');
      // file_actions.forEach(function(file_action) {
      //   file_action.start();
      // });
      var config_watcher = fs.watch(opts.config);
      var restart = function(event) {
        logger.info('Config ' + event + 'd: ' + opts.config);
        logger.info('Stopping ' + file_actions.length + ' watchers');
        _.invoke(file_actions, 'stop');
        // file_actions.forEach(function(file_action) { file_action.close(); });

        start(opts);
      };
      config_watcher.on('change', _.debounce(restart, 2000, true));
    }
  });
}

function main() {
  var optimist = require('optimist')
    .usage([
      'Usage: fs-change [options]',
      '   or: fs-change install',
    ].join('\n'))
    .describe({
      config: 'configuration file',
      log: 'log file',
      osx: 'use the notification center',
      help: 'print this help message',
      verbose: 'print extra output',
      version: 'print version',
    })
    .demand(['config'])
    .boolean(['help', 'verbose', 'version', 'osx'])
    .default({
      config: path.join(process.env.HOME, '.fs-change'),
      log: path.join(process.env.HOME, 'Library', 'Logs', 'fs-change.log'),
    });

  var argv = optimist.argv;

  if (argv.help) {
    optimist.showHelp();
  }
  else if (argv.version) {
    var package_json_path = path.join(__dirname, 'package.json');
    fs.readFile(package_json_path, 'utf8', function(err, data) {
      console.log(JSON.parse(data).version);
    });
  }
  else if (argv._.length && argv._[0] == 'install') {
    install(argv);
  }
  else {
    if (argv.log) {
      logger.add(logger.transports.File, {filename: argv.log});
    }
    if (argv.osx) {
      var NotificationCenterTransport = require('winston-notification-center');
      logger.add(NotificationCenterTransport, {title: 'File system watcher'});
    }

    logger.info('Starting.');
    start(argv);
  }
}

if (require.main === module) { main(); }