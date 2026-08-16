import { describe, it, expect, vi } from 'vitest';
import { createForm } from './create-form.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('ArrayController', () => {
  it('reports initial items and length', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { tags: ['a', 'b'] },
    });
    form.hostConnected();

    const tags = form.array('tags');
    expect(tags.items).toEqual(['a', 'b']);
    expect(tags.length).toBe(2);

    form.hostDisconnected();
  });

  it('appends to the end via push, preserving prior order', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { tags: ['a', 'b'] },
    });
    form.hostConnected();

    const tags = form.array('tags');
    tags.push('c');

    expect(tags.items).toEqual(['a', 'b', 'c']);

    form.hostDisconnected();
  });

  it('inserts at an index, shifting later entries', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { tags: ['a', 'b'] },
    });
    form.hostConnected();

    const tags = form.array('tags');
    tags.insert(1, 'x');

    expect(tags.items).toEqual(['a', 'x', 'b']);

    form.hostDisconnected();
  });

  it('removes an entry and keeps the remaining order intact', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { tags: ['a', 'b', 'c'] },
    });
    form.hostConnected();

    const tags = form.array('tags');
    tags.remove(0);

    // Removing the first entry leaves the rest in order at shifted indices.
    expect(tags.items).toEqual(['b', 'c']);
    expect(tags.items[0]).toBe('b');
    expect(tags.length).toBe(2);

    form.hostDisconnected();
  });

  it('reorders entries via swap without dropping any', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { tags: ['a', 'b', 'c'] },
    });
    form.hostConnected();

    const tags = form.array('tags');
    tags.swap(0, 2);

    expect(tags.items).toEqual(['c', 'b', 'a']);

    form.hostDisconnected();
  });

  it('reorders entries via move, preserving all entries in new order', () => {
    const host = createMockHost();
    const form = createForm(host as any, {
      initialValues: { tags: ['a', 'b', 'c'] },
    });
    form.hostConnected();

    const tags = form.array('tags');
    tags.move(0, 2);

    expect(tags.items).toEqual(['b', 'c', 'a']);

    form.hostDisconnected();
  });
});
