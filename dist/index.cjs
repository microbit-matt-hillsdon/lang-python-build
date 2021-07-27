'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var lezerPython = require('lezer-python');
var language = require('@codemirror/language');
var highlight = require('@codemirror/highlight');

function shouldDedentAfter(node, pos) {
    switch (node.type.name) {
        case "BreakStatement":
        case "ContinueStatement":
        case "PassStatement":
            return true;
        // For return and raise we need to check we're not in the expression.
        case "RaiseStatement":
        case "ReturnStatement":
            return pos >= node.to;
        default:
            return false;
    }
}
function bodyIndent(context) {
    // Indentation is significant in Python so modify it with care.
    let currentIndent = context.lineIndent(context.state.doc.lineAt(context.pos));
    let childBefore = context.node.childBefore(context.pos);
    if (childBefore && shouldDedentAfter(childBefore, context.pos))
        return context.baseIndent;
    let nodeBefore = context.node.resolve(context.pos, -1);
    let isBodyStart = nodeBefore && nodeBefore.name === ":";
    if (isBodyStart)
        return context.baseIndent + context.unit;
    return currentIndent;
}
/**
A language provider based on the [Lezer Python
parser](https://github.com/lezer-parser/python), extended with
highlighting and indentation information.
*/
const pythonLanguage = language.LezerLanguage.define({
    parser: lezerPython.parser.configure({
        props: [
            language.indentNodeProp.add({
                Body: bodyIndent,
                ArgList: language.delimitedIndent({ closing: ")" }),
                ArrayExpression: language.delimitedIndent({ closing: "]" }),
                DictionaryExpression: language.delimitedIndent({ closing: "}" }),
                ParamList: language.delimitedIndent({ closing: ")" }),
                ParenthesizedExpression: language.delimitedIndent({ closing: ")" }),
                TupleExpression: language.delimitedIndent({ closing: ")" }),
                Script: context => {
                    let currentIndent = context.lineIndent(context.state.doc.lineAt(context.pos));
                    if (context.pos + /\s*/.exec(context.textAfter)[0].length < context.node.to) {
                        return currentIndent;
                    }
                    // Position at the end of the document isn't inside a trailing body so adjust.
                    let lastNode = context.node.resolve(context.pos, -1);
                    for (let cur = lastNode; cur; cur = cur.parent)
                        if (cur.type.name == "Body")
                            return bodyIndent(new language.TreeIndentContext(context, context.pos, cur));
                    return currentIndent;
                },
            }),
            language.foldNodeProp.add({
                "Body ArrayExpression DictionaryExpression TupleExpression": language.foldInside
            }),
            highlight.styleTags({
                "async '*' '**' FormatConversion": highlight.tags.modifier,
                "for while if elif else try except finally return raise break continue with pass assert await yield": highlight.tags.controlKeyword,
                "in not and or is del": highlight.tags.operatorKeyword,
                "import from def class global nonlocal lambda": highlight.tags.definitionKeyword,
                "with as print": highlight.tags.keyword,
                self: highlight.tags.self,
                Boolean: highlight.tags.bool,
                None: highlight.tags.null,
                VariableName: highlight.tags.variableName,
                "CallExpression/VariableName": highlight.tags.function(highlight.tags.variableName),
                "FunctionDefinition/VariableName": highlight.tags.function(highlight.tags.definition(highlight.tags.variableName)),
                "ClassDefinition/VariableName": highlight.tags.definition(highlight.tags.className),
                PropertyName: highlight.tags.propertyName,
                "CallExpression/MemberExpression/PropertyName": highlight.tags.function(highlight.tags.propertyName),
                Comment: highlight.tags.lineComment,
                Number: highlight.tags.number,
                String: highlight.tags.string,
                FormatString: highlight.tags.special(highlight.tags.string),
                UpdateOp: highlight.tags.updateOperator,
                ArithOp: highlight.tags.arithmeticOperator,
                BitOp: highlight.tags.bitwiseOperator,
                CompareOp: highlight.tags.compareOperator,
                AssignOp: highlight.tags.definitionOperator,
                Ellipsis: highlight.tags.punctuation,
                At: highlight.tags.meta,
                "( )": highlight.tags.paren,
                "[ ]": highlight.tags.squareBracket,
                "{ }": highlight.tags.brace,
                ".": highlight.tags.derefOperator,
                ", ;": highlight.tags.separator
            })
        ],
    }),
    languageData: {
        closeBrackets: { brackets: ["(", "[", "{", "'", '"', "'''", '"""'] },
        commentTokens: { line: "#" },
        indentOnInput: /^\s*[\}\]\)]$/
    }
});
/**
Python language support.
*/
function python() {
    return new language.LanguageSupport(pythonLanguage);
}

exports.python = python;
exports.pythonLanguage = pythonLanguage;
