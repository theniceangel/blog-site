(self.webpackChunkblog_site=self.webpackChunkblog_site||[]).push([[5656],{3275:(s,a,l)=>{"use strict";l.r(a),l.d(a,{data:()=>e});const e={key:"v-28b9de3e",path:"/webpack4/loaders/",title:"Loaders",lang:"zh-CN",frontmatter:{},excerpt:"",headers:[{level:2,title:"使用 loaders",slug:"使用-loaders",children:[]},{level:2,title:"loader 的运行机制",slug:"loader-的运行机制",children:[]}],filePathRelative:"webpack4/loaders/README.md",git:{updatedTime:1630250925e3,contributors:[{name:"jizhi",email:"jizhi@didiglobal.com",commits:2}]}}},3395:(s,a,l)=>{"use strict";l.r(a),l.d(a,{default:()=>i});var e=l(6252);const n=(0,e.uE)('<h1 id="loaders" tabindex="-1"><a class="header-anchor" href="#loaders" aria-hidden="true">#</a> Loaders</h1><p>Loaders 是支撑起 webpack 架构的两大核心之一，它允许你对模块代码进行各种修改与转换，通过不同的 loaders 可以将文件从不同的语言转换成 js，也允许你在 js 的模块导入 CSS 文件。</p><h2 id="使用-loaders" tabindex="-1"><a class="header-anchor" href="#使用-loaders" aria-hidden="true">#</a> 使用 loaders</h2><p>使用 loaders 是需要在 webpack.config.js 配置对应的 <code>module.rules</code>。</p><div class="language-javascript ext-js"><pre class="shiki" style="background-color:#24292e;"><code><span class="line"><span style="color:#79B8FF;">module</span><span style="color:#E1E4E8;">.</span><span style="color:#79B8FF;">exports</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">  module: {</span></span>\n<span class="line"><span style="color:#E1E4E8;">    rules: [</span></span>\n<span class="line"><span style="color:#E1E4E8;">      { test:</span><span style="color:#DBEDFF;"> </span><span style="color:#9ECBFF;">/</span><span style="color:#85E89D;font-weight:bold;">\\.</span><span style="color:#DBEDFF;">css</span><span style="color:#F97583;">$</span><span style="color:#9ECBFF;">/</span><span style="color:#E1E4E8;">, loader: </span><span style="color:#9ECBFF;">&#39;css-loader&#39;</span><span style="color:#E1E4E8;">, options: { modules: </span><span style="color:#79B8FF;">true</span><span style="color:#E1E4E8;"> } }, </span><span style="color:#6A737D;">// css 文件都会被 css-loader 处理</span></span>\n<span class="line"><span style="color:#E1E4E8;">      { test:</span><span style="color:#DBEDFF;"> </span><span style="color:#9ECBFF;">/</span><span style="color:#85E89D;font-weight:bold;">\\.</span><span style="color:#DBEDFF;">ts</span><span style="color:#F97583;">$</span><span style="color:#9ECBFF;">/</span><span style="color:#E1E4E8;">, use: </span><span style="color:#9ECBFF;">&#39;ts-loader&#39;</span><span style="color:#E1E4E8;"> } </span><span style="color:#6A737D;">// ts 文件都会被 ts-loader 处理</span></span>\n<span class="line"><span style="color:#E1E4E8;">    ]</span></span>\n<span class="line"><span style="color:#E1E4E8;">  }</span></span>\n<span class="line"><span style="color:#E1E4E8;">};</span></span>\n<span class="line"></span></code></pre></div><h2 id="loader-的运行机制" tabindex="-1"><a class="header-anchor" href="#loader-的运行机制" aria-hidden="true">#</a> loader 的运行机制</h2>',6),o=(0,e.Uk)("请👇"),p=(0,e.Uk)("loader-runner"),r=(0,e.Uk)(" 来了解 loader 的原理，以及什么是 "),t=(0,e.Wm)("code",null,"'pitch'",-1),c=(0,e.Uk)(" 与 "),d=(0,e.Wm)("code",null,"'normal'",-1),E=(0,e.Uk)("。"),i={render:function(s,a){const l=(0,e.up)("RouterLink");return(0,e.wg)(),(0,e.j4)(e.HY,null,[n,(0,e.Wm)("p",null,[o,(0,e.Wm)(l,{to:"/webpack4/loaders/loader-runner.html"},{default:(0,e.w5)((()=>[p])),_:1}),r,t,c,d,E])],64)}}}}]);