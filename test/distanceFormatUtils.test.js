import test from "node:test";
import assert from "node:assert/strict";
import {
    formatDistanceFromBooking,
    formatDistanceFromMeters,
    formatDistanceValueWithUnit,
    metersToDisplayDistanceValue,
    parseDistanceUnit,
} from "../src/utils/functions/distanceFormatUtils.js";

test("parseDistanceUnit normalizes backend distance units", () => {
    assert.equal(parseDistanceUnit("km"), "Km");
    assert.equal(parseDistanceUnit("KM"), "Km");
    assert.equal(parseDistanceUnit("miles"), "Miles");
    assert.equal(parseDistanceUnit("Miles"), "Miles");
    assert.equal(parseDistanceUnit(null), "Km");
});

test("metersToDisplayDistanceValue converts raw meters for km and miles", () => {
    assert.equal(metersToDisplayDistanceValue(2500, "Km"), "2.50");
    assert.equal(metersToDisplayDistanceValue(1609.344, "Miles"), "1.00");
    assert.equal(metersToDisplayDistanceValue("not-a-number", "Km"), "");
});

test("formatDistanceFromBooking prefers backend display fields over raw distance", () => {
    assert.equal(
        formatDistanceFromBooking({ distance: 9999, distance_value: 1, distance_unit: "miles" }, "Km"),
        "1.00 Miles",
    );
});

test("formatDistanceFromBooking falls back to raw meters using selected panel unit", () => {
    assert.equal(formatDistanceFromBooking({ distance: 2500 }, "Km"), "2.50 Km");
    assert.equal(formatDistanceFromBooking({ distance: 1609.344 }, "Miles"), "1.00 Miles");
});

test("formatDistanceValueWithUnit keeps non-numeric values display-safe", () => {
    assert.equal(formatDistanceValueWithUnit("pending", "Km"), "pending Km");
    assert.equal(formatDistanceValueWithUnit("", "Miles"), "");
});

test("formatDistanceFromMeters hides missing or zero raw distances", () => {
    assert.equal(formatDistanceFromMeters(null, "Km"), "-");
    assert.equal(formatDistanceFromMeters(0, "Miles"), "-");
});
