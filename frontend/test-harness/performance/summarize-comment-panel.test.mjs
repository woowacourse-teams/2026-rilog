import assert from 'node:assert/strict';
import test from 'node:test';

import { median, summarize } from './summarize-comment-panel.mjs';

const record = (label, block, value) => ({
	label,
	block,
	metrics: Object.fromEntries(
		['open', 'close', 'tail', 'whole'].map((phase) => [
			phase,
			{ styleLayoutMs: phase === 'whole' ? value : 0, longTasks: 0 },
		]),
	),
	observed: { focusRestored: true, closed: true },
});
test('median uses middle pair and does not mutate sample', () => {
	const values = [6, 1, 4, 3];
	assert.equal(median(values), 3.5);
	assert.deepEqual(values, [6, 1, 4, 3]);
});
test('ABBA resampling keeps whole blocks and constant paired effect', () => {
	const records = Array.from({ length: 10 }, (_, b) => [
		record('A', b, 100),
		record('B', b, 70),
		record('B', b, 70),
		record('A', b, 100),
	]).flat();
	const result = summarize({ records });
	assert.deepEqual(result.pairedBlockBootstrap95Ms, [30, 30]);
	assert.equal(result.reductionPercent, 30);
	assert.equal(result.meetsPrimaryTarget, true);
});
test('incomplete ABBA blocks fail instead of presenting partial improvement', () => {
	assert.throws(() => summarize({ records: [record('A', 0, 100), record('B', 0, 20)] }), /Incomplete/);
});
test('an effect below the absolute target is not accepted', () => {
	const records = [record('A', 0, 20), record('B', 0, 15), record('B', 0, 15), record('A', 0, 20)];
	assert.equal(summarize({ records }).meetsPrimaryTarget, false);
});

test('a completed exploratory block cannot satisfy the final sample requirement', () => {
	const records = [record('A', 0, 100), record('B', 0, 20), record('B', 0, 20), record('A', 0, 100)];
	const result = summarize({ records });
	assert.equal(result.complete, false);
	assert.equal(result.meetsPrimaryTarget, false);
});
