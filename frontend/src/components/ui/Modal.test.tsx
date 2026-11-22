import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'solid-js/web';
import Modal from './Modal';

function renderModal(onClose: () => void) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(
    () => (
      <Modal title="Test title" onClose={onClose}>
        <p>child text</p>
      </Modal>
    ),
    host,
  );
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Modal', () => {
  it('renders the title and children', () => {
    const host = renderModal(() => {});
    expect(host.textContent).toContain('Test title');
    expect(host.textContent).toContain('child text');
  });

  it('calls onClose when the overlay is clicked', () => {
    let calls = 0;
    const host = renderModal(() => {
      calls++;
    });
    const overlay = host.firstElementChild as HTMLElement;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(calls).toBe(1);
  });

  it('does not close when the card itself is clicked', () => {
    let calls = 0;
    const host = renderModal(() => {
      calls++;
    });
    const overlay = host.firstElementChild as HTMLElement;
    const card = overlay.firstElementChild as HTMLElement;
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(calls).toBe(0);
  });

  it('calls onClose when the close button is clicked', () => {
    let calls = 0;
    const host = renderModal(() => {
      calls++;
    });
    const close = host.querySelector('button[aria-label="Close"]') as HTMLElement;
    close.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(calls).toBe(1);
  });
});
