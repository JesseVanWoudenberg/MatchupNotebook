import { describe, expect, it } from 'vitest'
import type { Ability } from '@/schema'
import {
  bestSkillOrderForView,
  buildStandardLevels,
  fillStandardLevels,
  summarizeMaxOrder,
} from './skillOrders'
import { makeSkillOrder } from '@/test/fixtures'

describe('summarizeMaxOrder', () => {
  it('lists basics by how many points they get, then by when they finish', () => {
    expect(summarizeMaxOrder(makeSkillOrder().levels)).toBe('Q > W > E')
  })
  it('breaks ties by which finished first', () => {
    const levels = buildStandardLevels(['Q', 'E', 'W'], ['E', 'Q', 'W'])
    expect(summarizeMaxOrder(levels)).toBe('E > Q > W')
  })
})

describe('buildStandardLevels', () => {
  it('fills eighteen levels with R at 6, 11 and 16 and basics to rank five', () => {
    const levels = buildStandardLevels(['Q', 'W', 'E'], ['Q', 'W', 'E'])
    expect(levels).toHaveLength(18)
    expect(levels[5]).toBe('R')
    expect(levels[10]).toBe('R')
    expect(levels[15]).toBe('R')
    expect(levels.filter((a) => a === 'Q')).toHaveLength(5)
    expect(levels.filter((a) => a === 'W')).toHaveLength(5)
    expect(levels.filter((a) => a === 'E')).toHaveLength(5)
    expect(levels.slice(0, 5)).toEqual(['Q', 'W', 'E', 'Q', 'Q'])
  })
  it('respects an early ultimate in the start sequence', () => {
    const levels = buildStandardLevels(['Q', 'R', 'W'], ['Q', 'W', 'E'])
    expect(levels[1]).toBe('R')
    expect(levels.filter((a) => a === 'R')).toHaveLength(3)
  })
  it('falls back to Q W E order for anything not in the max order', () => {
    const levels = buildStandardLevels([], ['E'])
    expect(summarizeMaxOrder(levels)).toBe('E > Q > W')
  })
})

describe('bestSkillOrderForView', () => {
  it('prefers the most specific fitting order', () => {
    const general = makeSkillOrder()
    const vsYasuo = makeSkillOrder({
      id: '00000000-0000-4000-8000-000000000051',
      scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
    })
    expect(bestSkillOrderForView([general, vsYasuo], { myChamp: 'Taliyah', enemy: 'Yasuo' })).toBe(
      vsYasuo,
    )
    expect(bestSkillOrderForView([general, vsYasuo], { myChamp: 'Taliyah' })).toBe(general)
    expect(bestSkillOrderForView([general, vsYasuo], { myChamp: 'Ahri' })).toBeUndefined()
  })
})

describe('fillStandardLevels', () => {
  it('keeps levels already set and fills the rest', () => {
    const existing: (Ability | undefined)[] = Array.from({ length: 18 }, () => undefined)
    existing[0] = 'E'
    existing[3] = 'W'
    const levels = fillStandardLevels(existing, ['Q', 'W'], ['Q', 'E', 'W'])
    expect(levels[0]).toBe('E')
    expect(levels[1]).toBe('W')
    expect(levels[3]).toBe('W')
    expect(levels[5]).toBe('R')
    expect(levels.filter((a) => a === 'Q')).toHaveLength(5)
    expect(levels.filter((a) => a === 'E')).toHaveLength(5)
  })
  it('works with no start and no max order', () => {
    const levels = fillStandardLevels([], [], [])
    expect(levels).toHaveLength(18)
    expect(summarizeMaxOrder(levels)).toBe('Q > W > E')
  })
})
