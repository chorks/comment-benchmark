var Benchmark = require("benchmark").Benchmark;
var suite = new Benchmark.Suite;

var contents = require("fs").readFileSync("testdata.txt", "utf-8");
var LineCounter = require("line-counter");

suite
    .add("regex", function () {
        var counter = new LineCounter(contents);
        var regex = /^[ \t]*?\/\*([\s\S]*?)\*\//mg;
        var comment;
        var result = [];
        while ((comment = regex.exec(contents)) != null) {
            result.push({
                begin: counter.countUpTo(comment.index),
                end: counter.countUpTo(comment.index + comment[0].length - 1),
                content: comment[1]
            });
        }
        return result;
    });

suite.add("iterate char-wise", function () {
    var counter = new LineCounter(contents);

    /**
     * Test if a string occurs at a given index within another string
     * @param aString
     * @param substr
     * @param index
     * @returns {boolean}
     */
    function substrTest(aString, substr, index) {
        if (aString.length < substr.length + index) {
            return false;
        }
        for (var i = 0; i < substr.length; i++) {
            if (aString[index + i] !== substr[i]) {
                return false;
            }
        }
        return true;
    }

    var result = [];
    var current = null;
    for (var i = 0; i < contents.length; i++) {
        if (current == null && substrTest(contents, "/*", i)) {
            current = {
                start: i
            }
        }
        if (current != null && substrTest(contents, "*/", i)) {
            current["end"] = i;
            current["text"] = contents.substr(current.start + 2, current.end - current.start - 4);
            result.push({
                begin: counter.countUpTo(current.start),
                end: counter.countUpTo(current.end),
                text: current.text
            });
            current = null;
        }
    }
    return result;
});

suite.add("iterate using 'indexOf'", function () {
    var counter = new LineCounter(contents);
    var i = 0;
    var current = null;
    var result = [];
    while (true) {
        if (current == null) {
            i = contents.indexOf("/*", i);
            if (i == -1) {
                break;
            } else {
                current = {
                    start: i
                }
            }
        } else {
            i = contents.indexOf("*/", i);
            if (i == -1) {
                break;
            } else {
                current["end"] = i+2;
                current["text"] = contents.substr(current.start + 2, current.end - current.start - 4);
                result.push({
                    begin: counter.countUpTo(current.start),
                    end: counter.countUpTo(current.end),
                    text: current.text
                });
                current = null;
            }
        }
    }
    return result;
});

suite.add("iterate line-wise", function () {
    // This snippet only finds comments that start on a new line (there may be spaces
    // in front of the comments, but nothing else. From the dataset, if find the same
    // number of comments as the other snippets
    var startPattern = "/*";
    var endPattern = "*/";

    var lines = contents.split("\n");
    var current = null;
    var result = [];
    for (var i = 0; i < lines.length; i++) {
        var trimmed = lines[i].trim();
        // Is the current line starting a comment? Check whether the line starts with a comment starter
        if (current == null && trimmed.lastIndexOf("/*", 0) === 0) {
            current = {
                start: i+1,
                lines: []
            }
        }
        // This is not in an else block, because we have to check the current line as well, just to be sure
        if (current != null) {
            // We are within the comment. Push the current line
            current.lines.push(trimmed);

            // is thie the end of the comment?
            var endIndex = trimmed.indexOf("*/");
            if (endIndex >= 0) {
                current.end = i + 1;
                // Strip everything after the end of the comment (on the last comment line, including the marker)
                var lastCommentIndex = current.lines.length - 1;
                current.lines[lastCommentIndex] = current.lines[lastCommentIndex].substr(0, endIndex);
                // Strip  the start-marker of the comment.
                current.lines[0] = current.lines[0].trim().substr(startPattern.length);
                current.text = current.lines.join("\n");
                result.push(current);
                current = null;
            }
        }
    }
    return result;
});

suite
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').pluck('name'));
    })
    .on('result', function (result) {
        console.log(arguments);
    });

suite.forEach(function (test) {
    // Output the number of comments found by each test
    var result = test.fn();
    console.log(test.name, result.length, result[4]);
});

suite.run();