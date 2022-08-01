(self.webpackChunkblog_site=self.webpackChunkblog_site||[]).push([[8330],{9754:(s,n,a)=>{"use strict";a.r(n),a.d(n,{data:()=>l});const l={key:"v-788f0001",path:"/webpack4/configuration/optimization/noEmitOnErrors.html",title:"noEmitOnErrors",lang:"zh-CN",frontmatter:{},excerpt:"",headers:[],filePathRelative:"webpack4/configuration/optimization/noEmitOnErrors.md",git:{updatedTime:162722505e4,contributors:[{name:"jizhi",email:"jizhi@didiglobal.com",commits:1}]}}},6167:(s,n,a)=>{"use strict";a.r(n),a.d(n,{default:()=>p});const l=(0,a(6252).uE)('<h1 id="noemitonerrors" tabindex="-1"><a class="header-anchor" href="#noemitonerrors" aria-hidden="true">#</a> noEmitOnErrors</h1><p>noEmitOnErrors 配置项决定是否开启 NoEmitOnErrorsPlugin插件，它的作用是构建过程中如果出现了 error，决定是否跳过输出静态资源的步骤，<code>production</code> 环境下才会开启插件。</p><div class="language-javascript ext-js"><pre class="shiki" style="background-color:#24292e;"><code><span class="line"><span style="color:#F97583;">class</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">NoEmitOnErrorsPlugin</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t</span><span style="color:#B392F0;">apply</span><span style="color:#E1E4E8;">(</span><span style="color:#FFAB70;">compiler</span><span style="color:#E1E4E8;">) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\tcompiler.hooks.shouldEmit.</span><span style="color:#B392F0;">tap</span><span style="color:#E1E4E8;">(</span><span style="color:#9ECBFF;">&quot;NoEmitOnErrorsPlugin&quot;</span><span style="color:#E1E4E8;">, </span><span style="color:#FFAB70;">compilation</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 这次构建出现 error</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t</span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (compilation.</span><span style="color:#B392F0;">getStats</span><span style="color:#E1E4E8;">().</span><span style="color:#B392F0;">hasErrors</span><span style="color:#E1E4E8;">()) </span><span style="color:#F97583;">return</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">false</span><span style="color:#E1E4E8;">;</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t});</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\tcompiler.hooks.compilation.</span><span style="color:#B392F0;">tap</span><span style="color:#E1E4E8;">(</span><span style="color:#9ECBFF;">&quot;NoEmitOnErrorsPlugin&quot;</span><span style="color:#E1E4E8;">, </span><span style="color:#FFAB70;">compilation</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\tcompilation.hooks.shouldRecord.</span><span style="color:#B392F0;">tap</span><span style="color:#E1E4E8;">(</span><span style="color:#9ECBFF;">&quot;NoEmitOnErrorsPlugin&quot;</span><span style="color:#E1E4E8;">, () </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\t</span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (compilation.</span><span style="color:#B392F0;">getStats</span><span style="color:#E1E4E8;">().</span><span style="color:#B392F0;">hasErrors</span><span style="color:#E1E4E8;">()) </span><span style="color:#F97583;">return</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">false</span><span style="color:#E1E4E8;">;</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t});</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t});</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t}</span></span>\n<span class="line"><span style="color:#E1E4E8;">}</span></span>\n<span class="line"></span></code></pre></div><p>compiler 的 shouldEmit 的触发时机在** webpack 编译结束之后，输出静态资源之前**，代码如下：</p><div class="language-javascript ext-js"><pre class="shiki" style="background-color:#24292e;"><code><span class="line"><span style="color:#F97583;">class</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">Compiler</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#B392F0;">run</span><span style="color:#E1E4E8;"> (</span><span style="color:#FFAB70;">callback</span><span style="color:#E1E4E8;">) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#6A737D;">// ...</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#F97583;">const</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">onCompiled</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> (</span><span style="color:#FFAB70;">err</span><span style="color:#E1E4E8;">, </span><span style="color:#FFAB70;">compilation</span><span style="color:#E1E4E8;">) </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// ...</span></span>\n<span class="line"></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 根据 shouldEmit hook 的返回值决定是否阻止输出静态资源</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t</span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (</span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.hooks.shouldEmit.</span><span style="color:#B392F0;">call</span><span style="color:#E1E4E8;">(compilation) </span><span style="color:#F97583;">===</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">false</span><span style="color:#E1E4E8;">) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\t</span><span style="color:#F97583;">const</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">stats</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">new</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">Stats</span><span style="color:#E1E4E8;">(compilation);</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\tstats.startTime </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> startTime;</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\tstats.endTime </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">Date</span><span style="color:#E1E4E8;">.</span><span style="color:#B392F0;">now</span><span style="color:#E1E4E8;">();</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\t</span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.hooks.done.</span><span style="color:#B392F0;">callAsync</span><span style="color:#E1E4E8;">(stats, </span><span style="color:#FFAB70;">err</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\t\t</span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (err) </span><span style="color:#F97583;">return</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">finalCallback</span><span style="color:#E1E4E8;">(err);</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\t\t</span><span style="color:#F97583;">return</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">finalCallback</span><span style="color:#E1E4E8;">(</span><span style="color:#79B8FF;">null</span><span style="color:#E1E4E8;">, stats);</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\t});</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\t</span><span style="color:#F97583;">return</span><span style="color:#E1E4E8;">;</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t}</span></span>\n<span class="line"></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 输出静态资源</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t</span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.</span><span style="color:#B392F0;">emitAssets</span><span style="color:#E1E4E8;">(compilation, </span><span style="color:#FFAB70;">err</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t\t</span><span style="color:#6A737D;">// ...</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t\t});</span></span>\n<span class="line"><span style="color:#E1E4E8;">\t\t};</span></span>\n<span class="line"><span style="color:#E1E4E8;">  }</span></span>\n<span class="line"><span style="color:#E1E4E8;">}</span></span>\n<span class="line"></span></code></pre></div><p>compilation 的 shouldRecord 触发时机是调用 seal 方法的时候。</p><div class="language-javascript ext-js"><pre class="shiki" style="background-color:#24292e;"><code><span class="line"><span style="color:#F97583;">class</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">Compilation</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#B392F0;">seal</span><span style="color:#E1E4E8;"> () {</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#6A737D;">// ...</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#F97583;">const</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">shouldRecord</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.hooks.shouldRecord.</span><span style="color:#B392F0;">call</span><span style="color:#E1E4E8;">() </span><span style="color:#F97583;">!==</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">false</span><span style="color:#E1E4E8;">;</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#6A737D;">// ...</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (shouldRecord) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 将 modules 以及 chunks 信息记录在 compiler 上</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.hooks.recordModules.</span><span style="color:#B392F0;">call</span><span style="color:#E1E4E8;">(</span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.modules, </span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.records);</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.hooks.recordChunks.</span><span style="color:#B392F0;">call</span><span style="color:#E1E4E8;">(</span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.chunks, </span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.records);</span></span>\n<span class="line"><span style="color:#E1E4E8;">    }</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#6A737D;">// ...</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (shouldRecord) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 将 hash 信息记录在 compiler 上</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.hooks.recordHash.</span><span style="color:#B392F0;">call</span><span style="color:#E1E4E8;">(</span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.records);</span></span>\n<span class="line"><span style="color:#E1E4E8;">    }</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#6A737D;">// ...</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (shouldRecord) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 预留好 record hook，HotModuleReplacementPlugin 会消费该钩子</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 目的是为了记录前后文件修改造成的 compiler 重新构建而生成的 hash 值</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 对比前后两次 hash 值就能得到哪些 modules 发生变化，然后将改变的 modules 组合成 hotUpdateChunk</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 运行时就能加载 hotUpdateChunk 进行热更新</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.hooks.record.</span><span style="color:#B392F0;">call</span><span style="color:#E1E4E8;">(</span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">, </span><span style="color:#79B8FF;">this</span><span style="color:#E1E4E8;">.records);</span></span>\n<span class="line"><span style="color:#E1E4E8;">    }</span></span>\n<span class="line"><span style="color:#E1E4E8;">  }</span></span>\n<span class="line"><span style="color:#E1E4E8;">}</span></span>\n<span class="line"></span></code></pre></div><p>由于每次发生变化，都是重新生成 compilation，但 compiler 始终是相同的实例，所以把很多有用的信息存入内存，也就是 compiler.records 对象。</p><p>在开发环境下，是不会用到该插件。</p>',9),p={render:function(s,n){return l}}}}]);