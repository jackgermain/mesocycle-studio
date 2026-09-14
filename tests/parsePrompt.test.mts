import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrompt } from "../src/generator/parsePrompt";

/** The box someone types into before pressing Generate. What matters most here is not that it reads a lot,
 * but that it never invents a constraint -- a program silently narrowed to dumbbells because the word
 * appeared in passing is worse than one that ignored the sentence entirely. */

test("reads days a week in the shapes people write them", () => {
  assert.equal(parsePrompt("5 days a week").daysPerWeek, 5);
  assert.equal(parsePrompt("4x a week please").daysPerWeek, 4);
  assert.equal(parsePrompt("six times a week").daysPerWeek, 6);
  assert.equal(parsePrompt("give me a 3 day split").daysPerWeek, 3);
});

test("does not invent a frequency that was not given", () => {
  assert.equal(parsePrompt("something for my glutes").daysPerWeek, undefined);
  // A number that is not a frequency must not be read as one.
  assert.equal(parsePrompt("I can bench 225").daysPerWeek, undefined);
});

test("reads Jack's emphasis vocabulary, pairings before single muscles", () => {
  assert.equal(parsePrompt("chest and triceps focus").understood.join(), "chest & triceps emphasis");
  assert.equal(parsePrompt("back and biceps").understood.join(), "back & biceps emphasis");
  assert.equal(parsePrompt("chest and back emphasis").understood.join(), "chest & back emphasis");
  // "chest and triceps" contains "chest" -- the broader rule must not swallow the specific one.
  assert.notEqual(parsePrompt("chest and triceps").understood.join(), "chest & back emphasis");
});

test("a lower-body ask picks the glute profile", () => {
  const p = parsePrompt("6 days a week, glute focused");
  assert.equal(p.profile, "glute-priority");
  assert.equal(p.goal, "lower-aesthetic");
  assert.equal(p.daysPerWeek, 6);
});

test("equipment only narrows when the wording is exclusive", () => {
  // A passing mention is not a restriction.
  assert.equal(parsePrompt("I have dumbbells at home").equipment, undefined);
  assert.equal(parsePrompt("the gym has machines and cables").equipment, undefined);
  // Exclusive wording is.
  assert.deepEqual(parsePrompt("dumbbells only").equipment, ["dumbbell"]);
  assert.deepEqual(parsePrompt("all I have is a barbell").equipment, ["barbell"]);
});

test("small muscles are picked up because they are opt-in", () => {
  assert.deepEqual(parsePrompt("add abs and calves").wants, ["Abs", "Calves"]);
  assert.deepEqual(parsePrompt("nothing fancy").wants, []);
});

test("it shows its working, so a misreading is visible before anything is generated", () => {
  const p = parsePrompt("5 days a week, glutes, dumbbells only, and abs");
  assert.deepEqual(p.understood, ["5 days a week", "lower body emphasis", "dumbbells only", "include abs"]);
});

test("an empty or unreadable prompt is not an error, it just understands nothing", () => {
  for (const s of ["", "   ", "hello", "make me strong"]) {
    const p = parsePrompt(s);
    assert.equal(p.daysPerWeek, undefined);
    assert.equal(p.profile, undefined);
    assert.deepEqual(p.wants, []);
  }
});
