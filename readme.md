## Simple Test Framework

Another lightweight testing utility for node. 

## Introduction

**Simple Test Framework** (**STF**) is is a library for testing
functionality of JavaScript code in Node and writing those results out
to a stream in human-readable format. STF is easy to set up and use,
and tests itself. 

If you want anything beyond this, STF doesn't do it, and won't at
anytime in the future. *But*, it may be easily combined with other
code and libraries to get this feature.

* STF is a library, not a command-line tool.
* STF is a library for testing, not assertions, mock-ups or spies.
* STF tests functionality, not code coverage, stress, etc.
* STF tests JavaScript code, not HTML, CSS, C++, bash, etc.
* STF tests JavaScript in node, not a browser, or rhino, etc.
* STF writes results to a stream, not to a server request, database, etc.
* STF writes results in a human-readable format, not HTML, XML, JSON, YAML, etc.

Not that I have anything against any of these features. I just want to
keep this library as simple as possibly, while still providing useful
features specific to testing.

# Features:

TODO:

## Getting Started

TODO:

## API

TODO:

## Philosophy

Simple-Test-Framework was designed with a "Keep It Simple" philosophy.
The specifics of that philosophy include the following ideals:

* Write Lightweight Code: The less code I write in my test framework, 
the less potential side effects it can have on your test. 
* Avoid Dependencies: The less I depend on other modules, the less I 
have to worry about those modules breaking and thus breaking this. 
* Minimize the API: Too many functions to use makes it more difficult 
to learn, more difficult to write tests, and less likely you will write 
good tests.
* Keep Out Feature-creep: The more stuff I put in here that isn't
needed for a Test Framework, the more complex the code, and the
more potential side effects it can have on your test. I almost 
didn't write the code that wrote the results out to stream.
* Don't Skimp On Goal-Oriented Features: Just because it's a feature
doesn't mean it's a creep. I can't really use the library for what
it's designed for without the feature, then I probably do want it. 
This is why I did end up adding code to write out the results.

## License

MIT
