// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { hasTransientMediaHtml } from './has-transient-media-html';

describe('hasTransientMediaHtml', () => {
	it.each([
		'<img src="data:image/heic;base64,private-image">',
		'<figure><img src="  DaTa:image/png;base64,private-image  "></figure>',
		'<video src="blob:https://rilog.test/video"></video>',
		'<audio><source src="blob:https://rilog.test/audio"></audio>',
		'<embed src="data:application/pdf;base64,private-file">',
		'<div data-content-type="file" data-url="data:application/pdf;base64,private-file"></div>',
		'<div data-content-type="image" data-url="blob:https://rilog.test/image"></div>',
		'<div data-content-type="video" data-url="data:video/mp4;base64,private-video"></div>',
		'<div data-content-type="audio" data-url="data:audio/mpeg;base64,private-audio"></div>',
		'<img src="&#100;ata:image/png;base64,private-image">',
		'<img data-url="https://cdn.rilog.test/safe.png" src="data:image/png;base64,private-image">',
		'<div data-content-type="image" data-url="d&#10;ata:image/png;base64,private-image"></div>',
		'<div data-content-type="image" data-url="&#1;data:image/png;base64,private-image"></div>',
	])('임시 미디어 URL이 있는 HTML이면 차단한다: %s', (html) => {
		expect(hasTransientMediaHtml(html)).toBe(true);
	});

	it.each([
		'',
		'<p><strong>정상 서식</strong></p>',
		'<pre><code>data:image/png;base64,example</code></pre>',
		'<p>&lt;img src="data:image/png;base64,example"&gt;</p>',
		'<img src="https://cdn.rilog.test/image.png">',
		'<div data-content-type="file" data-url="https://cdn.rilog.test/file.pdf"></div>',
		'<div data-content-type="paragraph" data-url="data:example">일반 문단</div>',
	])('정상 미디어와 일반 텍스트 HTML이면 허용한다: %s', (html) => {
		expect(hasTransientMediaHtml(html)).toBe(false);
	});
});
