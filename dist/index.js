import { parser } from 'lezer-python';
import { LezerLanguage, indentNodeProp, delimitedIndent, TreeIndentContext, foldNodeProp, foldInside, LanguageSupport } from '@codemirror/language';
import { styleTags, tags } from '@codemirror/highlight';

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
const pythonLanguage = /*@__PURE__*/LezerLanguage.define({
    parser: /*@__PURE__*/parser.configure({
        props: [
            /*@__PURE__*/indentNodeProp.add({
                Body: bodyIndent,
                ArgList: /*@__PURE__*/delimitedIndent({ closing: ")" }),
                ArrayExpression: /*@__PURE__*/delimitedIndent({ closing: "]" }),
                DictionaryExpression: /*@__PURE__*/delimitedIndent({ closing: "}" }),
                ParamList: /*@__PURE__*/delimitedIndent({ closing: ")" }),
                ParenthesizedExpression: /*@__PURE__*/delimitedIndent({ closing: ")" }),
                TupleExpression: /*@__PURE__*/delimitedIndent({ closing: ")" }),
                Script: context => {
                    let currentIndent = context.lineIndent(context.state.doc.lineAt(context.pos));
                    if (context.pos + /\s*/.exec(context.textAfter)[0].length < context.node.to) {
                        return currentIndent;
                    }
                    // Position at the end of the document isn't inside a trailing body so adjust.
                    let lastNode = context.node.resolve(context.pos, -1);
                    for (let cur = lastNode; cur; cur = cur.parent)
                        if (cur.type.name == "Body")
                            return bodyIndent(new TreeIndentContext(context, context.pos, cur));
                    return currentIndent;
                },
            }),
            /*@__PURE__*/foldNodeProp.add({
                "Body ArrayExpression DictionaryExpression TupleExpression": foldInside
            }),
            /*@__PURE__*/styleTags({
                "async '*' '**' FormatConversion": tags.modifier,
                "for while if elif else try except finally return raise break continue with pass assert await yield": tags.controlKeyword,
                "in not and or is del": tags.operatorKeyword,
                "import from def class global nonlocal lambda": tags.definitionKeyword,
                "with as print": tags.keyword,
                self: tags.self,
                Boolean: tags.bool,
                None: tags.null,
                VariableName: tags.variableName,
                "CallExpression/VariableName": /*@__PURE__*/tags.function(tags.variableName),
                "FunctionDefinition/VariableName": /*@__PURE__*/tags.function(/*@__PURE__*/tags.definition(tags.variableName)),
                "ClassDefinition/VariableName": /*@__PURE__*/tags.definition(tags.className),
                PropertyName: tags.propertyName,
                "CallExpression/MemberExpression/PropertyName": /*@__PURE__*/tags.function(tags.propertyName),
                Comment: tags.lineComment,
                Number: tags.number,
                String: tags.string,
                FormatString: /*@__PURE__*/tags.special(tags.string),
                UpdateOp: tags.updateOperator,
                ArithOp: tags.arithmeticOperator,
                BitOp: tags.bitwiseOperator,
                CompareOp: tags.compareOperator,
                AssignOp: tags.definitionOperator,
                Ellipsis: tags.punctuation,
                At: tags.meta,
                "( )": tags.paren,
                "[ ]": tags.squareBracket,
                "{ }": tags.brace,
                ".": tags.derefOperator,
                ", ;": tags.separator
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
    return new LanguageSupport(pythonLanguage);
}

export { python, pythonLanguage };
