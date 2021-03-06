"use strict"
var path = require('path')
var fs = require('fs')
var findit = require('findit')
var unzip = require('unzip')
var archiver = require('archiver')
var util = require('./util')

exports.extract = function (fpath, cb) {
  var input = fs.createReadStream(fpath)
  var zipPath = util.genTmpPath()
  var one = util.oneCallback(cb)

  input
    .pipe(unzip.Extract({ path: zipPath }))
    .on('error', one)
    .on('close', function () {
      one(null, zipPath)
    })
}

var validOgrRe = /^\.(shp|kml|tab|itf|000|rt1|gml|vrt)$/i
exports.findOgrFile = function (dpath, cb) {
  var finder = findit(dpath)
  var found
  finder.on('directory',function (dir, stat, stop) {
	  var base = path.basename(dir);
    if (validOgrRe.test(base)){ found = dir; stop() }
  })
  finder.on('file', function (file, stat) {
    if (validOgrRe.test(path.extname(file))) found = file
  })
  finder.on('error', function (er) {
    cb(er)
    finder.stop() // prevent multiple callbacks, stop at first error
  })
  finder.on('end', function () {
    if (!found) return cb(new Error('No valid files found'))
    cb(null, found)
  })
}

exports.createZipStream = function (dpath) {
  var zs = archiver('zip')

  fs.readdir(dpath, function (er, files) {
    if (er) return zs.emit('error', er)

    files.forEach(function (file) {
      var f = fs.createReadStream(path.join(dpath, file))
      zs.append(f, { name: file })
    })
    zs.finalize(function (er) {
      if (er) zs.emit('error', er)
    })
  })

  return zs
}
exports.createZipStreamFolder = function (dpath) {
	var archive = archiver('zip')
	var output = fs.createWriteStream("tmp/"+dpath+".zip");

	output.on('close', function () {
		console.log(archive.pointer() + ' total bytes');
		console.log('archiver has been finalized and the output file descriptor has closed.');
	});

	archive.on('error', function(err){
		throw err;
	});

	archive.pipe(output);
	archive.directory("tmp/"+dpath,dpath);
	/*
	archive.bulk([
	              { expand: true, cwd: 'source', src: ['**'], dest: 'source'}
	              ]);
	*/
	archive.finalize();
	return archive;
}
