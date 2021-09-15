# Base64

它是一种基于 64 个可打印字符来表示二进制数据的表示方法，因此 base64 每个可打印字符含有 6 个比特，一个字节有 8 个比特，要想显示 3 个字节，必须要有 4 个可打印字符来表示（**base64 编码需要的字节数必须是 3 的倍数，如果没有，补齐 1-2 个字节**），由于 base64 将**三个字节**转化成**四个字节**，因此Base64编码后的文本，会比原文本大出**三分之一左右**。

## 索引表

<table class="wikitable" style="text-align:center">
  <tbody>
    <tr>
      <th scope="col">数值</th>
      <th scope="col">字符</th>
      <td rowspan="17">&nbsp;</td>
      <th scope="col">数值</th>
      <th scope="col">字符</th>
      <td rowspan="17">&nbsp;</td>
      <th scope="col">数值</th>
      <th scope="col">字符</th>
      <td rowspan="17">&nbsp;</td>
      <th scope="col">数值</th>
      <th scope="col">字符</th></tr>
    <tr>
      <td>0</td>
      <td>A</td>
      <td>16</td>
      <td>Q</td>
      <td>32</td>
      <td>g</td>
      <td>48</td>
      <td>w</td></tr>
    <tr>
      <td>1</td>
      <td>B</td>
      <td>17</td>
      <td>R</td>
      <td>33</td>
      <td>h</td>
      <td>49</td>
      <td>x</td></tr>
    <tr>
      <td>2</td>
      <td>C</td>
      <td>18</td>
      <td>S</td>
      <td>34</td>
      <td>i</td>
      <td>50</td>
      <td>y</td></tr>
    <tr>
      <td>3</td>
      <td>D</td>
      <td>19</td>
      <td>T</td>
      <td>35</td>
      <td>j</td>
      <td>51</td>
      <td>z</td></tr>
    <tr>
      <td>4</td>
      <td>E</td>
      <td>20</td>
      <td>U</td>
      <td>36</td>
      <td>k</td>
      <td>52</td>
      <td>0</td></tr>
    <tr>
      <td>5</td>
      <td>F</td>
      <td>21</td>
      <td>V</td>
      <td>37</td>
      <td>l</td>
      <td>53</td>
      <td>1</td></tr>
    <tr>
      <td>6</td>
      <td>G</td>
      <td>22</td>
      <td>W</td>
      <td>38</td>
      <td>m</td>
      <td>54</td>
      <td>2</td></tr>
    <tr>
      <td>7</td>
      <td>H</td>
      <td>23</td>
      <td>X</td>
      <td>39</td>
      <td>n</td>
      <td>55</td>
      <td>3</td></tr>
    <tr>
      <td>8</td>
      <td>I</td>
      <td>24</td>
      <td>Y</td>
      <td>40</td>
      <td>o</td>
      <td>56</td>
      <td>4</td></tr>
    <tr>
      <td>9</td>
      <td>J</td>
      <td>25</td>
      <td>Z</td>
      <td>41</td>
      <td>p</td>
      <td>57</td>
      <td>5</td></tr>
    <tr>
      <td>10</td>
      <td>K</td>
      <td>26</td>
      <td>a</td>
      <td>42</td>
      <td>q</td>
      <td>58</td>
      <td>6</td></tr>
    <tr>
      <td>11</td>
      <td>L</td>
      <td>27</td>
      <td>b</td>
      <td>43</td>
      <td>r</td>
      <td>59</td>
      <td>7</td></tr>
    <tr>
      <td>12</td>
      <td>M</td>
      <td>28</td>
      <td>c</td>
      <td>44</td>
      <td>s</td>
      <td>60</td>
      <td>8</td></tr>
    <tr>
      <td>13</td>
      <td>N</td>
      <td>29</td>
      <td>d</td>
      <td>45</td>
      <td>t</td>
      <td>61</td>
      <td>9</td></tr>
    <tr>
      <td>14</td>
      <td>O</td>
      <td>30</td>
      <td>e</td>
      <td>46</td>
      <td>u</td>
      <td>62</td>
      <td>+</td></tr>
    <tr>
      <td>15</td>
      <td>P</td>
      <td>31</td>
      <td>f</td>
      <td>47</td>
      <td>v</td>
      <td>63</td>
      <td>/</td></tr>
  </tbody>
</table>

## 编码规则

- **第一步：每三个字节作为一组，一共 24 个比特**

- **第二步：分成 4 个 base64 单元，每个单元含有 6 个比特**

- **第三步：将每个单元的二进制转换成十进制**

- **第四步：查表，得到最后的 base64 的编码值**

## 案例

### 英语单词 Man

<img :src="$withBase('/assets/base64-man.png')" align="center" />

按照上述的编码规则处理，得到的编码值就是 `TWFu`

### 字符串 M

由于不满足三个字节，所以会补 16 个比特位，并且值都是 0。示意图如下：

<img :src="$withBase('/assets/base64-m.png')" align="center" />

红色的 0 都是额外补充的，加粗并且有下划线的 0 的个数为 4，决定了最后 base64 的编码值是 `==`

### 字符串 Ma

由于不满足三个字节，所以会补 8 个比特位，并且值都是 0。示意图如下：

<img :src="$withBase('/assets/base64-ma.png')" align="center" />

红色的 0 都是额外补充的，加粗并且有下划线的 0 的个数为 2，决定了最后 base64 的编码值是 `=`

### 中文汉字——国

由于汉字本身支持很多种编码，比如 gbk、utf-8 等等，每一种编码的 base64 值都不一样，以最常见的 utf-8 举例。对于 `国` 字，它的 utf-8 的二进制是 `'111001011001101110111101'`

<img :src="$withBase('/assets/base64-guo.png')" align="center" />

想要测试以上的结果可以使用 [playground](https://base64.us/)。

:::danger 危险
在 JavaScript 里面，编码都是 UTF-16 格式，对于**汉字**而言，码点与 UTF-8 不一致，所以需要将 UTF-16 的码点转换成 UTF-8。关于 UTF-8 的 unicode 可以👇[Unicode In Javascript](./unicodeInJavascript.md)。
:::