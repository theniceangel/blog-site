(self.webpackChunkblog_site=self.webpackChunkblog_site||[]).push([[8781],{4187:(s,n,a)=>{"use strict";a.r(n),a.d(n,{data:()=>l});const l={key:"v-0520d8e8",path:"/webpack4/internal-plugins/entry/EntryOptionPlugin.html",title:"EntryOptionPlugin",lang:"zh-CN",frontmatter:{},excerpt:"",headers:[],filePathRelative:"webpack4/internal-plugins/entry/EntryOptionPlugin.md",git:{updatedTime:1630856917e3,contributors:[{name:"jizhi",email:"jizhi@didiglobal.com",commits:1}]}}},6527:(s,n,a)=>{"use strict";a.r(n),a.d(n,{default:()=>d});var l=a(6252);const p=(0,l.uE)('<h1 id="entryoptionplugin" tabindex="-1"><a class="header-anchor" href="#entryoptionplugin" aria-hidden="true">#</a> EntryOptionPlugin</h1><p>EntryOptionPlugin 是为了分析 webpack 入口模块究竟是哪种类型。</p><details class="custom-container details"><summary>lib/EntryOptionPlugin.js</summary><div class="language-javascript ext-js"><pre class="shiki" style="background-color:#24292e;"><code><span class="line"><span style="color:#F97583;">const</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">itemToPlugin</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> (</span><span style="color:#FFAB70;">context</span><span style="color:#E1E4E8;">, </span><span style="color:#FFAB70;">item</span><span style="color:#E1E4E8;">, </span><span style="color:#FFAB70;">name</span><span style="color:#E1E4E8;">) </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (</span><span style="color:#79B8FF;">Array</span><span style="color:#E1E4E8;">.</span><span style="color:#B392F0;">isArray</span><span style="color:#E1E4E8;">(item)) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">    </span><span style="color:#F97583;">return</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">new</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">MultiEntryPlugin</span><span style="color:#E1E4E8;">(context, item, name);</span></span>\n<span class="line"><span style="color:#E1E4E8;">  }</span></span>\n<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#F97583;">return</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">new</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">SingleEntryPlugin</span><span style="color:#E1E4E8;">(context, item, name);</span></span>\n<span class="line"><span style="color:#E1E4E8;">};</span></span>\n<span class="line"></span>\n<span class="line"><span style="color:#79B8FF;">module</span><span style="color:#E1E4E8;">.</span><span style="color:#79B8FF;">exports</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">class</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">EntryOptionPlugin</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#B392F0;">apply</span><span style="color:#E1E4E8;">(</span><span style="color:#FFAB70;">compiler</span><span style="color:#E1E4E8;">) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">    compiler.hooks.entryOption.</span><span style="color:#B392F0;">tap</span><span style="color:#E1E4E8;">(</span><span style="color:#9ECBFF;">&quot;EntryOptionPlugin&quot;</span><span style="color:#E1E4E8;">, (</span><span style="color:#FFAB70;">context</span><span style="color:#E1E4E8;">, </span><span style="color:#FFAB70;">entry</span><span style="color:#E1E4E8;">) </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// context 是 webpack 运行的上下文路径</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#6A737D;">// 如果 entry 的值是字符串，默认名称是 &#39;main&#39;</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (</span><span style="color:#F97583;">typeof</span><span style="color:#E1E4E8;"> entry </span><span style="color:#F97583;">===</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;string&quot;</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">||</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">Array</span><span style="color:#E1E4E8;">.</span><span style="color:#B392F0;">isArray</span><span style="color:#E1E4E8;">(entry)) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">        </span><span style="color:#B392F0;">itemToPlugin</span><span style="color:#E1E4E8;">(context, entry, </span><span style="color:#9ECBFF;">&quot;main&quot;</span><span style="color:#E1E4E8;">).</span><span style="color:#B392F0;">apply</span><span style="color:#E1E4E8;">(compiler);</span></span>\n<span class="line"><span style="color:#E1E4E8;">      } </span><span style="color:#F97583;">else</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (</span><span style="color:#F97583;">typeof</span><span style="color:#E1E4E8;"> entry </span><span style="color:#F97583;">===</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;object&quot;</span><span style="color:#E1E4E8;">) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">        </span><span style="color:#6A737D;">// 如果 entry 的值是对象，key 会作为名称</span></span>\n<span class="line"><span style="color:#E1E4E8;">        </span><span style="color:#F97583;">for</span><span style="color:#E1E4E8;"> (</span><span style="color:#F97583;">const</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">name</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">of</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">Object</span><span style="color:#E1E4E8;">.</span><span style="color:#B392F0;">keys</span><span style="color:#E1E4E8;">(entry)) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">          </span><span style="color:#B392F0;">itemToPlugin</span><span style="color:#E1E4E8;">(context, entry[name], name).</span><span style="color:#B392F0;">apply</span><span style="color:#E1E4E8;">(compiler);</span></span>\n<span class="line"><span style="color:#E1E4E8;">        }</span></span>\n<span class="line"><span style="color:#E1E4E8;">      } </span><span style="color:#F97583;">else</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">if</span><span style="color:#E1E4E8;"> (</span><span style="color:#F97583;">typeof</span><span style="color:#E1E4E8;"> entry </span><span style="color:#F97583;">===</span><span style="color:#E1E4E8;"> </span><span style="color:#9ECBFF;">&quot;function&quot;</span><span style="color:#E1E4E8;">) {</span></span>\n<span class="line"><span style="color:#E1E4E8;">        </span><span style="color:#F97583;">new</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">DynamicEntryPlugin</span><span style="color:#E1E4E8;">(context, entry).</span><span style="color:#B392F0;">apply</span><span style="color:#E1E4E8;">(compiler);</span></span>\n<span class="line"><span style="color:#E1E4E8;">      }</span></span>\n<span class="line"><span style="color:#E1E4E8;">      </span><span style="color:#F97583;">return</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">true</span><span style="color:#E1E4E8;">;</span></span>\n<span class="line"><span style="color:#E1E4E8;">    });</span></span>\n<span class="line"><span style="color:#E1E4E8;">  }</span></span>\n<span class="line"><span style="color:#E1E4E8;">};</span></span>\n<span class="line"></span></code></pre></div></details><p>触发 <code>compiler.hooks.entryOption</code> 钩子的时机在是调用 <code>webpackOptionsApply.process</code> 的时候。</p><div class="language-javascript ext-js"><pre class="shiki" style="background-color:#24292e;"><code><span class="line"><span style="color:#6A737D;">// 钩入 entryOption hook</span></span>\n<span class="line"><span style="color:#F97583;">new</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">EntryOptionPlugin</span><span style="color:#E1E4E8;">().</span><span style="color:#B392F0;">apply</span><span style="color:#E1E4E8;">(compiler);</span></span>\n<span class="line"><span style="color:#6A737D;">// 触发 entryOption hook</span></span>\n<span class="line"><span style="color:#E1E4E8;">compiler.hooks.entryOption.</span><span style="color:#B392F0;">call</span><span style="color:#E1E4E8;">(options.context, options.entry);</span></span>\n<span class="line"></span></code></pre></div><p>所以 EntryOptionPlugin 是根据用户配置的 entry 类型来决定使用以下哪种插件。</p><ul><li><strong><code>SingleEntryPlugin</code></strong>：entry 的值是<strong>字符串</strong></li></ul><div class="language-javascript ext-js"><pre class="shiki" style="background-color:#24292e;"><code><span class="line"><span style="color:#6A737D;">// webpack.config.js</span></span>\n<span class="line"><span style="color:#79B8FF;">module</span><span style="color:#E1E4E8;">.</span><span style="color:#79B8FF;">exports</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">  entry: </span><span style="color:#9ECBFF;">&#39;./index.js&#39;</span></span>\n<span class="line"><span style="color:#E1E4E8;">}</span></span>\n<span class="line"></span></code></pre></div>',8),o=(0,l.Uk)("详细请👇"),e=(0,l.Uk)("SingleEntryPlugin"),t=(0,l.Uk)("。"),E=(0,l.uE)('<ul><li><strong><code>MultiEntryPlugin</code></strong>：entry 的值是<strong>数组</strong></li></ul><div class="language-javascript ext-js"><pre class="shiki" style="background-color:#24292e;"><code><span class="line"><span style="color:#6A737D;">// webpack.config.js</span></span>\n<span class="line"><span style="color:#79B8FF;">module</span><span style="color:#E1E4E8;">.</span><span style="color:#79B8FF;">exports</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">  entry: [</span><span style="color:#9ECBFF;">&#39;./index.js&#39;</span><span style="color:#E1E4E8;">, </span><span style="color:#9ECBFF;">&#39;./index2.js&#39;</span><span style="color:#E1E4E8;">]</span></span>\n<span class="line"><span style="color:#E1E4E8;">}</span></span>\n<span class="line"></span></code></pre></div>',2),c=(0,l.Uk)("详细请👇"),r=(0,l.Uk)("MultiEntryPlugin"),y=(0,l.Uk)("。"),i=(0,l.uE)('<ul><li><strong><code>DynamicEntryPlugin</code></strong>：entry 的值是<strong>函数</strong></li></ul><div class="language-javascript ext-js"><pre class="shiki" style="background-color:#24292e;"><code><span class="line"><span style="color:#6A737D;">// webpack.config.js</span></span>\n<span class="line"><span style="color:#79B8FF;">module</span><span style="color:#E1E4E8;">.</span><span style="color:#79B8FF;">exports</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">=</span><span style="color:#E1E4E8;"> {</span></span>\n<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#B392F0;">entry</span><span style="color:#E1E4E8;">: () </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> [</span><span style="color:#9ECBFF;">&#39;./a.js&#39;</span><span style="color:#E1E4E8;">, </span><span style="color:#9ECBFF;">&#39;./b.js&#39;</span><span style="color:#E1E4E8;">],</span></span>\n<span class="line"><span style="color:#E1E4E8;">  </span><span style="color:#B392F0;">entry</span><span style="color:#E1E4E8;">: () </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> </span><span style="color:#F97583;">new</span><span style="color:#E1E4E8;"> </span><span style="color:#79B8FF;">Promise</span><span style="color:#E1E4E8;">((</span><span style="color:#FFAB70;">resolve</span><span style="color:#E1E4E8;">) </span><span style="color:#F97583;">=&gt;</span><span style="color:#E1E4E8;"> </span><span style="color:#B392F0;">resolve</span><span style="color:#E1E4E8;">([</span><span style="color:#9ECBFF;">&#39;./demo&#39;</span><span style="color:#E1E4E8;">, </span><span style="color:#9ECBFF;">&#39;./demo2&#39;</span><span style="color:#E1E4E8;">]))</span></span>\n<span class="line"><span style="color:#E1E4E8;">}</span></span>\n<span class="line"></span></code></pre></div>',2),F=(0,l.Uk)("详细请👇"),u=(0,l.Uk)("DynamicEntryPlugin"),g=(0,l.Uk)("。"),d={render:function(s,n){const a=(0,l.up)("RouterLink");return(0,l.wg)(),(0,l.j4)(l.HY,null,[p,(0,l.Wm)("p",null,[o,(0,l.Wm)(a,{to:"/webpack4/internal-plugins/entry/SingleEntryPlugin.html"},{default:(0,l.w5)((()=>[e])),_:1}),t]),E,(0,l.Wm)("p",null,[c,(0,l.Wm)(a,{to:"/webpack4/internal-plugins/entry/MultiEntryPlugin.html"},{default:(0,l.w5)((()=>[r])),_:1}),y]),i,(0,l.Wm)("p",null,[F,(0,l.Wm)(a,{to:"/webpack4/internal-plugins/entry/DynamicEntryPlugin.html"},{default:(0,l.w5)((()=>[u])),_:1}),g])],64)}}}}]);