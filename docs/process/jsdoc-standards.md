# JSdocs Standards 
This document is meant to provide standards of how to format JS code comments in order to have clean documentation of code.
- [JSdocs Standards](#jsdocs-standards)
  - [Comment Requirements](#comment-requirements)
  - [Examples](#examples)
## Comment Requirements
- *** All functions must include these standards***
- **all comments must be above the function they describing for JSdocs to work**
- all comments must start with `/**` and end with `*/`
- add a short 2-3 sentence giving a high-level summary of what a function does 
- if functions have parameters include a line starting with the `@param{type}` tag and then provide a short description of what the parameter is 
-  if functions have a return statement include a line starting with the `@returns{type}` tag and then provide a short description of what the function returns is 
-  use the `@deprecated` tag if a function becomes obsolete and add details of what function to replace its usage
-  for custom objects use the `@typedef{Object}` write the name of the object
-  for custom objects use the `@property{type}`, including the name of the property along with a short description of what the property is 
  
## Examples

This is an example of what a completed comment for a function should look like for JSdocs to work

> /**
> Adds 2 numbers together
> @param{number} 1st value to be added
> @param{number} 2nd value to be added
> @returns{number} the sum of the values added together
> @example
> let a = 10
> let b = 20
> const value = addNum(a,b);
> console.log(result);
> // Logs: 30
> */
> function addNum(Num1,Num2){
> return Num1+Num2;
> }

This is an example of what a deprecated function looks like

> /**
> @deprecated
> */
> function addNum(Num1,Num2){
> return Num1+Num2;
> }

This is what a custom object would look like
>/**
> @typedef {Object} Dog
> @property {string} breed, name of breed
> @property {string} gender, gender of dog
> const dog= {
> breed:'Pitbull'
> gender:'Male'
> };

