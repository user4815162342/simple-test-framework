/**
 * This module defines an object which can write the results to a stream.
 * Any alternative output for the results can easily be created by
 * fulfilling the same API.
 * */

var library = require("./library");
var util = require('util');

// I'm bringing this one in simply because I don't want to have
// to write yet more wordwrap code. It breaks the philosophy for this
// module, but this one works so much better than what I could write
// in a few hours.
var wordwrap = require("wordwrap");

/**
 * A ResultWriter accepts a Test results object and writes it's
 * data out to a stream. If the stream isn't set, this will default
 * to stdout.
 * 
 * NOTE: The stream object doesn't have to be a real stream. All it
 * really needs is an object with a method called 'write', which will
 * receive a string as it's parameter for everything written out. 
 * 
 * Parameters:
 * - stream: The stream to write to, optional.
 * */
var ResultWriter = module.exports = function(stream) {
    this._output = stream || process.stdout;
    
    /**
     * Specifies the string to concatenate onto the indent when nested
     * content is output.
     * */
    this.indentIncrease = "  ";

    // FUTURE: Test this on windows. I don't know if Windows consoles
    // are valid TTY's.
    /**
     * Specifies the code to use for turning on bold text.
     * */
    this.boldOn = this._output.isTTY ? "\x1B[1m" : "";
    /**
     * Specifies the code to use for turning off bold text.
     * */
    this.boldOff = this._output.isTTY ? "\x1B[0m" : "";
    
}

/**
 * Writes the results of the test to the output. This should really only
 * be called after the application is relatively certain that the tests
 * are completed, but it should be able to work if the test isn't completed
 * as well.
 * 
 * Parameters:
 * - test: The results.Test object containing the results.
 * - indent: a set of spaces to indent lines with. Default is an empty string.
 * Nested calls will increase this indent by a specific ammount.
 * */
ResultWriter.prototype.writeTest = function(test,indent) {
    indent = indent || "";

     var result = test.isPassed() ? "passed" : test.isCompleted() ? (this.boldOn + "failed" + this.boldOff) : (this.boldOn + "incomplete" + this.boldOff);
    
     this.writeData(util.format("%s -- %d/%d: %s",result,test.passed,test.total,test.name),indent);
    // If the test passed, we don't need to know anything more, a summary is plenty.
    if (result !== "passed") {
        indent += this.indentIncrease;
        this.writeTestMessages(test,indent);
        test.contents.forEach(function(item) {
            this.writeTestContent(item,indent);
        }.bind(this));
    }


}

/**
 * Writes important errors about the test's state, indicating why
 * it isn't passed.
 * 
 * Parameters:
 * - test: test to retrieve data from.
 * - indent: The amount of spaces to indent the content. Default is
 * an empty string.
 * */
ResultWriter.prototype.writeTestMessages = function(test,indent) {
    indent = indent || "";
    // Write errors and messages indicating why it's not passed.

    // Need to provide some alerts for why the test didn't pass. But only
    // provide one alert based on importance, don't overload the user
    // with additional alerts which might not even be there once the first
    // one is fixed..
    
    /*
     * Potential states for the test:
     * A: test.finished:
     *   1) true: The test has been marked as finished.
     *   2) false: The test has not been marked as finished,
     *     everything below is meaningless.
     * B: test.finishReason
     *   1) null: then the test finished normally
     *   2) any other: then the test finished abnormally
     * C: test.expected:
     *   1) null: No checkpoints were specifically planned
     *   2) == test.total: All checkpoints were crossed and subtests were 
     *        initiated
     *   3) != test.total: Some checkpoints were not crossed or some
     *        subtests were not initiated
     * D: test.failed:
     *   1) 0: No checkpoints or subtests have failed.
     *   2) > 0: Some checkpoint or subtests have failed.
     * E: test.errors
     *   1) 0: No error annotations have been added
     *   2) > 0: Error annotations have been added
     * E: test.pending:
     *   1) 0: All subtests, if any, have been finished
     *   2) > 0: Some subtests have not finished yet.
     * 
     * Basically, we need to alert to problems with comments if:
     * - test.finished is false
     * - test.finishReason != null
     * - test.expected != null and test.expected != test.total
     * - test.failed > 0
     * - test.pending > 0
     * - test.errors > 0
     * 
     * */
    if (!test.finished) { // incomplete
        this.writeError("Test was not finished before results were output.",indent);
    } else if ((test.expected !== null) &&
         (test.expected !== test.total)) { // incomplete
        var unseenTests = test.expected - test.total;
        var plural = unseenTests == 1 ? "" : "s";
        var were = unseenTests == 1 ? "was" : "were"
        this.writeError(util.format("%d expected check%s or test%s %s not seen.",unseenTests,plural,plural,were),indent);
    } else if (test.pending !== 0) { // incomplete
        var were = test.pending == 1 ? "was" : "were"
        this.writeError(util.format("%d subtest%s %s not completed.",test.pending,test.pending === 1 ? "" : "s",were),indent);
    } else if (test.finishReason === null) { // failed
        // We don't need to put the actual reason, that should have been
        // marked by the test itself.
        this.writeError("Test finished abnormally, see results.",indent);
    } if (test.failed !== 0) { // failed
        this.writeError(util.format("%d test%s failed, see results.",test.failed,test.failed === 1 ? "" : "s"),indent);
    } else if (test.errors !== 0) { // failed
        var were = test.errors == 1 ? "was" : "were"
        this.writeError(util.format("%d error message%s %s reported, see results.",test.errors,test.errors === 1 ? "" : "s",were),indent);
    } 
    
}

/**
 * Writes an item of test content
 * 
 * Parameters:
 * - item: a test item
 * - indent: The spaces to indent the content. Default is
 * an empty string.
 * */
ResultWriter.prototype.writeTestContent = function(item,indent) {
    if (item instanceof library.Checkpoint) {
        this.writeData(util.format("%s: %s",item.passed ? "passed" : (this.boldOn + "failed" + this.boldOff),item.name),indent);
    } else if (item instanceof library.Annotation) {
        switch (item.kind) {
            case "error":
               this.writeError(item.data,indent);
               break;
            case "comment":
               this.writeComment(item.data,indent);
               break;
            default:
               // NOTE: If you see this '????' in here, then either something's
               // broken in STF, or someone's creating their own comments with
               // invalid 'kinds'. Not an error.
               this.writeData(item.data,indent + "// ???? ");
               break;
            
        }
    } else if (item instanceof library.Test) {
        this.writeTest(item,indent);
    } else {
        // NOTE: If you see this '???' in here, then either something's
        // broken in STF, or someone's adding arbitrary test data.
        // Not an error.
        this.writeData(item,indent + "// ??? ")
    }
}

/**
 * Writes raw text to the output. Please don't use this except for
 * test results themselves. If you wish to write a message for the 
 * user, use writeComment or writeError instead.
 * 
 * If the message is not a string, the results of util.inspect will
 * be written instead. If the message is an Error object, the stack
 * trace will also be printed out.
 * 
 * If the message is multiple lines, the lineHeader will be placed at
 * the beginning of each line. A linefeed will be added to the end of the
 * message.
 * 
 * Parameters:
 * - message: a string or other object to be written.
 * - lineStart: The text to appear at the beginning of each line. Default is
 * an empty string.
 * */
ResultWriter.prototype.writeData = function(message,lineHeader,bold) {
    lineHeader = lineHeader || "";
    if (typeof message === "string") {
        // first, wrap the lines if necessary
        var lines;
        if (this._output.isTTY) {
            lines = wordwrap.hard(this._output.columns - lineHeader.length)(message).split(/\n/);
        } else {
            // Not a TTY, so we don't have to wrap, so
            // just split the lines at delimiters
            lines = message.split(/\n/);
        }
        this.endProgress();
        var prefix = (bold ? (this.boldOn + lineHeader) : lineHeader);
        var suffix = (bold ? (this.boldOff + "\n") : "\n");
        for (var i = 0; i < lines.length; i++) {
            this._output.write(prefix + lines[i] + suffix);
        }
    } else if (message instanceof Error) {
        this.writeData(util.inspect(message) + "\n" + message.stack,lineHeader,bold);
    } else {
        this.writeData(util.inspect(message),lineHeader,bold);
    }
}

/**
 * Writes a comment out to the output. The comment will be prefixed
 * with a javascript single-line comment marker (//)
 * 
 * Parameters:
 * - data: a string or object to be written
 * - indent: The spaces to indent the content. Default is
 * an empty string.
 * */
ResultWriter.prototype.writeComment = function(data,indent) {
    indent = indent || "";
    this.writeData(data,indent + "// ");
}

/**
 * Writes a comment out to the output. The comment will be prefixed
 * with a javascript single-line comment marker plus exclamation
 * point (// !)
 * 
 * Parameters:
 * - data: a string or object to be written
 * - indent: The spaces to indent the content. Default is
 * an empty string.
 * */
ResultWriter.prototype.writeError = function(data,indent) {
    indent = indent || "";
    this.writeData(data,indent + "// ! ",true);
}

/**
 * Shows progress when something's taking a long time. This is used
 * by the main test function to show that the script hasn't stopped
 * responding. Basically, starts a comment, and as long as nothing
 * else has been written, will keep using that same thing. If something
 * else get's written, it will start the progress some more.
 * 
 * Parameters:
 * - message: A name to display on the progress bar to explain what it's
 *   for.
 * - indent: The spaces to indent the content when restarting the
 * progress. Default is an empty string.
 * 
 * */
 ResultWriter.prototype.showProgress = function(message,indent) {
     indent = indent || "";
     if (this._progressBarExists) {
         this._output.write("-");
     } else {
         this._progressBarExists = true;
         this._output.write(indent + "/* " + message + " -");
     }
     
 }
 
 ResultWriter.prototype.endProgress = function() {
     if (this._progressBarExists) {
        this._output.write("*/\n");
        this._progressBarExists = false;
     }
 }
