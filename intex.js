//globalMemory contains all the native methods which can be used
import { tokenGenerator } from "./token-gen.js";
const globalMemory = {
  echo: {
    //method to print shit
    name: "echo",
    isReserved: false,
    type: "func",
    params: [],
    body: (params) => {
      var printArray = [];
      for (element in params) {
        if (params[element].body) {
          printArray.push(params[element].body);
        } else if (typeof params[element].body === "number")
          printArray.push(params[element]);
        else printArray.push(JSON.stringify(params[element]));
      }
      for (element in printArray) console.log(printArray[element]);
    },
  },
  pb: {
    //push_back for arrays
    name: "pb",
    isReserved: true,
    type: "func",
    params: [],
    body: (params) => {
      let context = params[0]; //this params[0] = this
      let arrayVariable = params[1]; //this params[1]
      let pushVariable = params[2]; //this params[2]
      if (typeof pushVariable === "object") pushVariable = pushVariable.body;
      let newVar = context.getVariable(arrayVariable.name).body;
      newVar.push(pushVariable);
      context.memory[arrayVariable].body = newVar;
    },
  },
};

function Mjolnir(globalMemory) {
  this.memory = global;
  this.tokenIterator = 0;
  this.callStack = [];
}
Mjolnir.prototype.getVariable = function (variableName) {
  if (this.memory[variableName]) return this.memory[variableName];
  throw new Error(`${variableName} is not defined`);
};
Mjolnir.prototype.code = function (code) {
  //takes code as text input and tokenizes input
  this.tokenize(code);
  if (!this.TOKENS.length) return "";

  // return this.runCode();
};
Mjolnir.prototype.Advance = function () {
  this.tokenIterator++;
};
Mjolnir.prototype.tokenize = function (code) {
  this.TOKENS = tokenGenerator(code);
  return;
};
////////////////////////////////////////////////////////////////
Mjolnir.prototype.findExpression = function () {
  var leftTerm = this.findTerm();

  // this.Advance();
  var operator = this.TOKENS[this.tokenIterator];
  // console.log(operator);
  if (["ADD", "SUB"].includes(operator.type)) {
    this.Advance();
    var rightTerm = this.findExpression();
    if (!rightTerm) throw new Error("Unsupported syntax type");
    return {
      body: { left: leftTerm, operator: operator, right: rightTerm },
      type: "exp",
    };
  }
  return leftTerm;
};
Mjolnir.prototype.findTerm = function () {
  var leftFactor = this.findFactor();
  this.Advance();
  var operator = this.TOKENS[this.tokenIterator];
  if (["MULTIPLY", "DIVIDE", "MOD"].includes(operator.type)) {
    this.Advance();
    var rightFactor = this.findTerm();
    if (!rightFactor) throw new Error("Unsupported syntax");
    return {
      body: { left: leftFactor, operator: operator, right: rightFactor },
      type: "exp",
    };
  }
  return leftFactor;
};
Mjolnir.prototype.findFactor = function () {
  var tk = this.TOKENS[this.tokenIterator];
  if (tk.type === "IDENTIFIER") {
    if (this.TOKENS[this.tokenIterator + 1].type !== "LPAREN") return tk;
    else {
      this.Advance();
      this.Advance();
      var params = [];
      if (this.TOKENS[this.tokenIterator].type !== "RPAREN") {
        params = this.findParams();
      }
      if (this.TOKENS[this.tokenIterator].type !== "RPAREN")
        throw new Error("Invalid Syntax");
      return { body: { name: tk.name, params: params }, type: "call" };
    }
  }
  if (tk.type === "STRING" || tk.type === "NUMBER" || tk.type === "BOOLEAN") {
    return tk;
  }
  if (tk.type == "ARRAYSTART") {
    this.Advance();
    var array = this.findArray();
    // console.dir(array, { depth: null });
    if (this.TOKENS[this.tokenIterator].type === "ARRAYEND") {
      return { body: array, type: "array" };
    } else throw new Error("Unsupported syntax");
  }
  if (tk.name === "-") {
    this.Advance();
    var rightFactor = this.findFactor();
    if (!rightFactor) throw new Error("Unsupported syntax");
    return {
      body: { left: 0, operator: "-", right: rightFactor },
      type: "exp",
    };
  }
  if (tk.type === "LPAREN") {
    this.Advance();
    var expression = this.findExpression();
    // console.dir(expression, { depth: null });
    // console.log(this.TOKENS[this.tokenIterator]);
    // this.Advance();
    tk = this.TOKENS[this.tokenIterator];
    if (tk.type !== "RPAREN") throw new Error("Unsupported syntax");
    return { body: expression, type: "exp" };
  }
  //add function call code
  return undefined;
  //return undefined
};
Mjolnir.prototype.findArray = function () {
  var returnArr = [];
  var exp = this.findExpression();

  if (exp) returnArr.push(exp);
  else return returnArr;
  var entry = false;
  while (this.TOKENS[this.tokenIterator].type === "SEPARATOR") {
    this.Advance();
    exp = this.findExpression();
    if (!exp) throw new Error("Unspported syntax!");

    returnArr.push(exp);
    // this.Advance();
    entry = true;
  }
  return returnArr;
};
Mjolnir.prototype.findParams = function () {
  var returnArr = [];
  var exp = this.findExpression();
  if (exp) returnArr.push(exp);
  else return returnArr;
  while (this.TOKENS[this.tokenIterator].type === "SEPARATOR") {
    this.Advance();

    exp = this.findExpression();
    if (!exp) throw new Error("Unspported syntax!");
    returnArr.push(exp);
  }
  return returnArr;
};
//////////////////////////////variableDeclaration///////////////////////////////
Mjolnir.prototype.findVariableKeyword = function () {
  var tk = this.TOKENS[this.tokenIterator];
  if (["num", "arr", "str", "bool", "func"].includes(tk.name)) {
    this.Advance();
    return tk.name;
  }
};
Mjolnir.prototype.findVariableName = function () {
  var tk = this.TOKENS[this.tokenIterator];
  if (tk.type === "IDENTIFIER") {
    this.Advance();
    return tk.name;
  }
};
Mjolnir.prototype.findAssignmentOperator = function () {
  var tk = this.TOKENS[this.tokenIterator];
  if (tk.type === "ASSIGNMENT") {
    this.Advance();
    return tk.name;
  }
};
Mjolnir.prototype.findVariableBody = function () {
  var compa = this.findComparison();
  if (compa) return compa;
  else throw new Error("syntax err!");
};
Mjolnir.prototype.findVariableDeclaration = function () {
  var vbk = this.findVariableKeyword();
  if (!vbk) throw new Error("syntax err!");
  var vbn = this.findVariableName();
  if (!vbn) throw new Error("syntax err!");
  var ass = this.findAssignmentOperator();
  if (!ass) throw new Error("Syntax error");
  var vb;
  if (vbk === "func") vb = this.findFunctionDeclaration();
  else vb = this.findVariableBody();
  if (!vb) throw new Error("syntax err!");
  return {
    type: "variabledeclare",
    body: { name: vbn, "variable-body": vb, "variable-type": vbk },
  };
};
////////////////////////////Function declaration//////////////////////////////////
Mjolnir.prototype.findFunctionArguments = function () {
  var tk = this.TOKENS[this.tokenIterator];
  if (tk.type === "LPAREN") {
    this.Advance();
    tk = this.TOKENS[this.tokenIterator];
    if (tk.type === "RPAREN") return [];
    else {
      var returnArr = [];
      var kw = this.findVariableKeyword();
      if (!kw) throw new Error("Syntax error");
      var name = this.findVariableName();
      if (!name) throw new Error("Syntax error");
      returnArr.push({ name: name, type: kw });
      while (this.TOKENS[this.tokenIterator].type === "SEPARATOR") {
        this.Advance();
        var kw = this.findVariableKeyword();
        if (!kw) throw new Error("Syntax error");
        var name = this.findVariableName();
        if (!name) throw new Error("Syntax error");
        returnArr.push({ name: name, type: kw });
      }
      return returnArr;
    }
  } else return undefined;
};
Mjolnir.prototype.findFunctionDeclaration = function () {
  var funcArgs = this.findFunctionArguments();
  this.Advance();
  // console.log(funcArgs);
  if (!funcArgs) throw new Error("Syntax error");
  if (this.TOKENS[this.tokenIterator].type === "BLOCKSTART") {
    this.Advance();

    var exp = this.findProgram();
    // console.dir(exp, { depth: null });
    if (exp.length === 0) throw new Error("Syntax error");
    if (this.TOKENS[this.tokenIterator].type !== "BLOCKEND")
      throw new Error("Syntax error");
    this.Advance();
    return { args: funcArgs, body: exp };
  }
};
//function can be evaluated using a local interpreter
///////////////////////////////Comparison///////////////////////////
Mjolnir.prototype.findComparison = function () {
  var leftTerm = this.findExpression();
  var tk = this.TOKENS[this.tokenIterator];
  if (tk.type === "LESS" || tk.type === "GREATER" || tk.type === "EQUAL") {
    this.Advance();
    var rightTerm = this.findExpression();
    if (!rightTerm) throw new Error("Syntax error");
    return {
      body: { left: leftTerm, operator: tk, right: right },
      type: "exp",
    };
  }
  return leftTerm;
};
//////////////////////Conditionals/////////////////////////////////////////
Mjolnir.prototype.findConditional = function () {
  var tk = this.TOKENS[this.tokenIterator];
  if (tk !== "IF_STATEMENT") return;
  this.Advance();
  var compa = this.findComparison();
  if (!compa) throw new Error("Syntax error");
  var ifBlock;
  if (this.TOKENS[this.tokenIterator].type === "BLOCKSTART") {
    this.Advance();
    var exp = this.findProgram();
    if (exp.length === 0) throw new Error("Syntax error");
    if (this.TOKENS[this.tokenIterator].type !== "BLOCKEND")
      throw new Error("Syntax error");
    ifBlock = { body: exp };
  } else throw new Error("Syntax error");
  tk = this.TOKENS[this.tokenIterator];
  if (tk !== "ELSE_STATEMENT")
    return { body: { compare: compa, if: ifBlock, else: null } };
  this.Advance();
  var elseBlock;
  if (this.TOKENS[this.tokenIterator].type === "BLOCKSTART") {
    this.Advance();
    var exp2 = this.findProgram();
    if (exp2.length === 0) throw new Error("Syntax error");
    if (this.TOKENS[this.tokenIterator].type !== "BLOCKEND")
      throw new Error("Syntax error");
    elseBlock = { body: exp2 };
    return { body: { compare: compa, if: ifBlock, else: elseBlock } };
  } else throw new Error("Syntax error");
};
///////////////////////////Assignment////////////////////////////
Mjolnir.prototype.findAssignment = function () {
  var tk = this.findVariableName();
  var ass = this.findAssignment();
  if (!ass) throw new Error("Syntax error");
  var rightexp = this.findExpression();
  if (!rightexp) throw new Error("Syntax error");
  return {
    body: {
      left: tk.name,
      operator: { name: "=", type: "ASSIGNMENT" },
      right: rightexp,
    },
    type: "exp",
  };
};
//////////////////////////////Program////////////////////////////
Mjolnir.prototype.findLineEnd = function () {
  var tk = this.TOKENS[this.tokenIterator];
  if (tk.type !== "LINEEND") throw new Error("Syntax error");
  this.Advance();
};
Mjolnir.prototype.findProgram = function () {
  var AST = [];
  while (this.tokenIterator < this.TOKENS.length) {
    var tk = this.TOKENS[this.tokenIterator];
    if (["num", "arr", "func", "bool", "str"].includes(tk.name)) {
      var vardecl = this.findVariableDeclaration();
      // console.log(this.TOKENS[this.tokenIterator]);
      if (!vardecl) throw new Error("Syntax error");
      // console.log(this.TOKENS[this.tokenIterator]);
      this.findLineEnd();
      AST.push(vardecl);
      continue;
    }
    if (tk.type === "IF_STATEMENT") {
      var cond = this.findConditional();
      if (!cond) throw new Error("Syntax error");
      this.findLineEnd();
      AST.push(cond);
      continue;
    }
    if (tk.type === "IDENTIFIER") {
      var assign = this.findAssignment();
      if (!assign) throw new Error("Syntax error");
      this.findLineEnd();

      AST.push(assign);
      continue;
    }
    if (tk.type === "RETURN") {
      this.Advance();
      var ret = this.findExpression();
      if (!ret) throw new Error("Syntax error");
      this.findLineEnd();
      ret.type = "return";
      AST.push(ret);
      continue;
    }
    if (tk.type === "BLOCKEND" || tk.type === "ENDOFCODE") break;
  }

  return AST;
}; //add advance at last};
////////////////////////////////////////////////////////////////

var interpreter = new Mjolnir();
interpreter.code(`
  func fun = (num a, num b) <<
    ->a+b;
  >>;
`);
console.log(interpreter.TOKENS);
var exp = interpreter.findProgram();
console.dir(exp, { depth: null });
// console.log(interpreter.TOKENS[interpreter.tokenIterator]);
