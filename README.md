# fs-change for Windows

This is a fork of [fs-change](https://github.com/chbrown/fs-change) by Christopher H. Brown. I have modified it to work on a Windows filesystem...or rather, MY Windows box. :P

Node.js process to monitor changes to specified files or directories, and execute
some specified action in response.

`fs-change` accepts two command line arguments:

* `--config` where to read which files to watch.
    - By default, fs-change reads settings from `__dirname/.fs-change`. Definition of `__dirname` is [here](http://nodejs.org/docs/latest/api/globals.html#globals_dirname).
    - But the location of this file can be specified using this command line flag, e.g., `fs-change --config /opt/local/watching`.
* `--log` where to write the log file.
    - Defaults to `__dirname/fs-change.log` (which can easily be viewed with Console.app)

## Installation

###For Mac OS X:

Please refer to the original [fs-change](https://github.com/chbrown/fs-change).

###For Windows 8:
_This may be a crude process but it's how I got it to work._ If you have something more streamlined, feel free to fork this project and create a pull request!
- Clone/download the source to your machine
- Browse to the project's root folder using the Command Prompt and install using `npm install -g .`
- Create your .fs-change file (see below)
- Run with `fs-change`

## `__dirname/.fs-change` format

Each line has a glob (or simple file) on the left of a '->', and a command on
the right.

The command on the right will have the following keywords available:

- {file}, the fullpath of the matching file (usually just the string to the left
  of the colon).
- {basename}, the shortname of {file}, without path or extension.
- {dirname}, the directory containing {file}.

## `__dirname/.fs-change` example

    C:\temp\site.less-> cd {dirname} && lessc -C site.less site.css
    C:\temp\less\*.less-> cd {dirname} && lessc -C {basename}.less {basename}.css

## TODO

* Add example .fs-change file

## Issues?
If you are on a Windows box, post your issue to this repo. OSX issues are probably better reported to the [original Github project](https://github.com/chbrown/fs-change).

## License

Copyright © 2012–2013 Christopher Brown. [MIT Licensed](LICENSE).
