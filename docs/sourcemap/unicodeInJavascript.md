# Unicode in JavaScript

最近在学习 [babylon](https://github.com/babel/babylon) 的词法解析，发现了一段很有趣的代码，百思不得其解。

```js
// this.input 输入的字符串
// this.state.pos 当前解析字符串的索引
fullCharCodeAtPos() {
  const code = this.input.charCodeAt(this.state.pos);
  if (code <= 0xd7ff || code >= 0xe000) return code;

  const next = this.input.charCodeAt(this.state.pos + 1);
  return (code << 10) + next - 0x35fdc00;
}
```

从方法名可知，目的是为了获取某个字符的 unicode 编码单元（code point）。按道理，通过 `charCodeAt` 方案就可以返回某个字符的编码单元，后面的 **if** 语句的作用是什么？

遇到了问题，先上 [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt) 查了一下 **charCodeAt** 的文档。

> The **charCodeAt()** method returns an integer between 0 and 65535 representing the UTF-16 code unit at the given index.
> charCodeAt 方法返回一个介于0和65535之间的整数，该整数表示给定索引处的UTF-16编码单元。

从上述来看，如果编码单元超过 65535，那么 **charCodeAt** 方法就无效了，但是为什么阈值是 65535 呢，编码单元什么时候会超过 65535 呢。带着这个疑问，我在谷歌上收集了若干资料，发现这是一个巨大的坑。

## Unicode

计算机只处理数字，所以存储任何一个信息，必须要有一个唯一的标志，不同国家也设计过不同的标准，比如 ASCII，GB2312、GBK、GB18030 而 Unicode 的产生就是为了解决传统的字符集的局限性问题，并且覆盖世界上任何语言的字符。它从 0 开始，为每个字符映射一个唯一编号，形式为 `U+x{4,6}`，`x` 为十六进制数，最少 4 位，最多 6 位。

```
U+4e00 = "一" // 中文"一"
```

上述的四位十六进制数就是 Unicode 的编码单元，也叫做**码点(code point)**，范围从 `U+0000` 到 `U+10FFFF`，总共包含 1114112 (17 * $2^{20}$)个码点。

## UTF-16

Unicode 只是规定了每个字符的码点，那对于文件具体要怎么编码，就牵涉到编码方法，有 UTF-8，UTF-16，UTF-32 等等，先了解一下 UTF-16，因为根据 MDN 的 `charCodeAt` 方法描述就提及到 UTF-16 码点。

  1. **基本定义**

      |  编码范围   | 字节  | 名称 |
      |  ----  | ----  | ---- |
      | 0x0000 - 0xFFFF  | 2 | Basic Multilingual Plane |
      | 0x10000 - 0x10FFFF  | 4 | Supplementary Multilingual Plane |

      UTF-16 编码的特点就是**定长**和**变长**，它将所有的码点分为两个范围，其中 `0x0000 - 0xFFFF` 代表**基本多语言平面（BMP）**，包含了我们大多数通用的字符，其余的就是**补充多语言平面（SMP）**，BMP 的字符码点的最大值是 `0xFFFF`(**$2^{16}$**)，也就是 65536，因为一个字节需要 8 个二进制位，那么要表示 BMP 的字符码点则需要 2 个字节。那么对于 **SMP**，字符共有 **$2^{20}$** 个，也就是需要 20 个二进制位才能完全唯一映射，那么就产生了**代理对**(Surrogate pairs)的概念。

  2. **代理对**

      由于**补充多语言平面**的字符共有 **$2^{20}$** 个，而且**基本多语言平面**内，从 `U+D800` 到 `U+DFFF` 是一个空段，也就是这些码点不映射任何字符，总共有 **$2^{11}$** 个，UTF-16 将**补充多语言平面**的 20 位拆成两半，前 10 位映射在 U+D800 到 U+DBFF（空间大小 $2^{10}$），称为高位（H），后10位映射在U+DC00 到 U+DFFF（空间大小 $2^{10}$），称为低位（L），它们组成了**代理对**，也就是说**补充多语言平面**的字符是由两个**基本多语言平面**的字符表示。

  4. **UTF-16的转码公式**

      举个例子，如果是**基本多语言平面的字符**，直接转换成十六进制即可。比如版权符号“©️”，它的码点是 `U+00A9`。

      ```
      U+00A9 = 0x00A9
      ```

      那么对于**补充多语言平面**，“𠮷”字，它的码点是 `U+20BB7`，UTF-16 给出的公式是：

      ```js
      // C 是码点，对应上面的 0x20BB7
      H = Math.floor((C - 0x10000) / 0x400) + 0xD800
      L = (C - 0x10000) % 0x400 + 0xDC00
      ```

      通过计算可以得出它的高位是 `\ud842`，低位是 `\udfb7`，如果你在浏览器的控制台打印如下，可以发现

      ```js
      console.log("\ud842\udfb7") // 打印:"𠮷"
      ```

      如果你打印它的 length，你会更惊讶！

      ```js
      console.log("𠮷".length) // 打印: 2
      ```

      **如果你是做一个表单 textarea 限制字数的功能，会不会感觉头疼？**

      当然在 JavaScript 你也许会碰到更多神奇的事情，这个下文会提及。

  5. **高低位是如何拆分的**

      我是一个好奇心比较强的人，上文提及到这样一段话，当然也是我查资料得到的。

      > **基本多语言平面**内，从 `U+D800` 到 `U+DFFF` 是一个空段，也就是这些码点不映射任何字符，总共有 **$2^{11}$** 个，UTF-16 将**补充多语言平面**的 20 位拆成两半，前 10 位映射在 U+D800 到 U+DBFF（空间大小 $2^{10}$），称为高位（H），后 10 位映射在U+DC00 到 U+DFFF（空间大小 $2^{10}$），称为低位（L）。

      仔细想想，**前 10 位映射在高位区间，后 10 位映射在低位区间，到底是怎么映射的？**

      这里牵涉到一个[具体的公式](https://www.ietf.org/rfc/rfc2781.txt)，查看 2.1 节，

      ```
      // 假设补充多语言平面字符的码点为 U，

      // 转化成二进制
      1) Let U' = (U - 0x10000) .toString(2)

      // (如果不够 20 位，高位补 0)，得到 20 位的二进制数
      U' = yyyyyyyyyyxxxxxxxxxx

      // 前面十位落在高位（起点就是 `U+D800`，转换成二进制就是 1101100000000000）
      H = 110110yyyyyyyyyy
      // 后面十位落在低位（起点就是 `U+DC00`，转换成二进制就是 1101110000000000）
      L = 110111xxxxxxxxxx
      ```

      为了验证一下这个公式，继续拿上面的 "𠮷" 举个例子。

      ```js
      // 第一步 换算成二进制
      let U = (0x20BB7 - 0x10000) .toString(2) // "10000101110110111"

      // 第二步 高位补 0
      U = "00010000101110110111"

      // 第三步 截取字符串，得到高低位
      H = "110110" + "0001000010"
      L = "110111" + "1110110111"

      // 第四部 二进制换算成十六进制
      H = 0xd842
      L = 0xdfb7

      // 与UTF-16的转码公式的结果一模一样，印证了代理对的原理
      ```
## babylon fullCharCodeAtPos

熟悉 UTF-16 代理对的概念之后，回到文章开头的那段 `fullCharCodeAtPos` 中的 **if** 语句，因为如果碰到**补充多语言平面**的字符， charCodeAt 返回的是代理对的高位码点，代理对的区间是[0xD800, 0xDFFF]，所以只要是不在这个区间，表明是**基本多语言平面**的字符，否则再获取代理对的低位码点，通过下面的算法计算**补充多语言平面**字符的 Unicode 码点。

```js
// this.input 输入的字符串
// this.state.pos 当前解析字符串的索引
fullCharCodeAtPos() {
  const code = this.input.charCodeAt(this.state.pos);
  if (code <= 0xd7ff || code >= 0xe000) return code;

  const next = this.input.charCodeAt(this.state.pos + 1);
  return (code << 10) + next - 0x35fdc00;
}
```

## UTF-8

UTF-16 需要至少 2 个或者 4 个字节，其实对于字符 "a" 来说，它的码点是 `U+0061`，其实只需要一个字节，也就是 8 位二进制数表示即可，对于 UTF-16，高位都必须补 0，从而浪费空间，那么 UTF-8 的优势就凸显出来了，**UTF-8是一种变长的编码方法，字符长度从1个字节到4个字节不等，最前面的128个字符，只使用1个字节表示，与 ASCII 码完全相同**，因此更节省空间。

  1. **基本定义**

      |  编码范围   | 字节  |
      |  ----  | ----  |
      | 0x0000 - 0x007F  | 1 |
      | 0x0080 - 0x07FF  | 2 |
      | 0x0800 - 0xFFFF  | 3 |
      | 0x010000 - 0x10FFFF  | 4 |

      对于 UTF-8 来说，字符的码点处于不同区间，那么字节数也不一样，那如果我读取文件，怎么判断应该读取一个还是多个字节来组成字符呢，这就牵涉到 UTF-8 的转码公式。

  2. **UTF-8的转码公式**

      |  Unicode符号范围   | UTF-8编码方式  |
      |  ----  | ----  |
      | 0x0000 - 0x007F  | 0xxxxxxx |
      | 0x0080 - 0x07FF  | 110xxxxx 10xxxxxx |
      | 0x0800 - 0xFFFF  | 1110xxxx 10xxxxxx 10xxxxxx |
      | 0x010000 - 0x10FFFF  | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx |

      步骤如下：
      1) 对于单字节，也就 Unicode 码点小于 128 的字符，最高位是 `0`，其余位都是这个符号的 Unicode 码点值的二进制。
      2) 对于 **n**(**n** >= **2**) 字节，第一个字节的前 **n** 位都设为 1，第 **n + 1** 位设为 0，后面字节的前两位一律设为**10**。剩下的没有提及的二进制位，全部为这个符号的 Unicode 码点的二进制（**从低位开始填充，如果位数不够，那么高位补 0 即可**）。

      很多人对步骤二很疑惑，那么举个例子。汉字`一`的 Unicode 码点值是 `U+4E00`，转换成二进制是 "100111000000000"。

      查上面表格，`一` 是处于第三行的区间，也就是三个字节长，那么将转换的二进制从右向左开始填充，得到下面。

      ```
      1110{0}100 10111000 10000000 // 大括号的 0 则是高位补 0

      // 转换成十六进制: 0xE4B880，三个字节
      ```

以上就是 UTF-16 和 UTF-8 的基本要点，接下来要谈谈 `Unicode In JavaScript`。

## Unicode In JavaScript

首先 JavaScript 采用的是 "Unicode" 字符集，那么编码方法是什么呢？有[权威人士](https://mathiasbynens.be/notes/javascript-encoding)给出了答案。

> 从 JS 的引擎来说是采用 UTF-16， 从 JS 的语言设计来说，采用的是 UCS-2


对于我们开发者来说，就是怎样去解决以下的 JavaScript 问题？

1. **获取字符码点**

    ```js
    let s = "𠮷"
    s.charCodeAt(0) // 55362 错了！获取到的只是代理对的高位

    // ES6
    s.codePointAt(0) // 134071 正确！

    // 低版本兼容——MDN 版本一
    var codePointAt = function(position) {
      if (this == null) {
        throw TypeError();
      }
      var string = String(this);
      var size = string.length;
      // `ToInteger`
      var index = position ? Number(position) : 0;
      if (index != index) { // better `isNaN`
        index = 0;
      }
      // Account for out-of-bounds indices:
      if (index < 0 || index >= size) {
        return undefined;
      }
      // Get the first code unit
      var first = string.charCodeAt(index);
      var second;
      if ( // check if it’s the start of a surrogate pair
        first >= 0xD800 && first <= 0xDBFF && // high surrogate
        size > index + 1 // there is a next code unit
      ) {
        second = string.charCodeAt(index + 1);
        if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
          // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
        }
      }
      return first;
    };

    // 低版本兼容——Babylon 版本二
    function fullCharCodeAtPos(input) {
      const code = input.charCodeAt(0);
      if (code <= 0xd7ff || code >= 0xe000) return code;

      const next = input.charCodeAt(1);
      return (code << 10) + next - 0x35fdc00;
    }
    ```

2. **字符串长度**

    ```js
    "𠮷".length // 2

    // "𠮷" 的 Unicode 码点属于补充多语言平面
    // 由两个基本多语言平面的码点组成代理对，长度为 2

    // 解决一：
    const punycode = require('punycode');
    punycode.ucs2.decode('𠮷').length // 1

    // 解决二：
    var regexAstralSymbols = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

    function countSymbols(string) {
      return string
        // Replace every surrogate pair with a BMP symbol.
        .replace(regexAstralSymbols, '_')
        // …and *then* get the length.
        .length;
    }
    countSymbols('𠮷').length // 1

    // ES6 方案
    function countSymbols(string) {
      return Array.from(string).length;
    }

    countSymbols('𠮷').length // 1

    function countSymbols(string) {
      return [...string].length;
    }

    countSymbols('𠮷').length // 1
    ```

3. **字符串反转**

    ```js
      "abc".split('').reverse().join('') // "cba"
      "𠮷".split('').reverse().join('') // "??"

      // "𠮷" 反转其实是将 "\ud842\udfb7" 反转
      // 变成 "\udfb7\ud842"，自然不识别


      // 解决：
      const esrever = require('esrever');
      console.log(esrever.reverse('𠮷')) // "𠮷"
      ```

4. **正则表达式**

    ```js
    /foo.bar/.test('foo💩bar') // false

    // ES6
    /foo.bar/u.test('foo💩bar') // true
    ```

    上述说明`.`只能匹配 `💩`（`"\ud83d\udca9"`） 的代理对的高位 `"\ud83d"`，但是 ES6 加了一个 `u` flag 来支持。

    也可以通过如下的正则，详情可以参考 [Regenerate](https://mths.be/regenerate)：

    ```js
    /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/.test('💩') // true! wtf~~
    ```

## 总结

从上面的解决方案来看，ES6 对 Unicode 还是得到部分增强，如果你理解了上面的 UTF-16 编码，阅读[阮老师的 ES6 字符串的扩展](https://es6.ruanyifeng.com/#docs/string)也觉得毫无压力了。如果你遇到 Unicode 的问题，尤其是做关于**表单**，**富文本 emoji** 等相关功能的时候，可以找 [Mathias Bynens](https://github.com/mathiasbynens) 获取一些答案，他是这方面的权威专家。

参考资料：

https://zh.wikipedia.org/wiki/Unicode

[javascript-encoding](https://mathiasbynens.be/notes/javascript-encoding)

[javascript-unicode](https://mathiasbynens.be/notes/javascript-unicode)

[UTF-16 RFC](https://www.ietf.org/rfc/rfc2781.txt)

http://www.ruanyifeng.com/blog/2014/12/unicode.html

https://unicode-table.com/en/#control-character
