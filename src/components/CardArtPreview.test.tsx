import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CardArtPreview } from './CardArtPreview'

const IMG = 'https://cards.scryfall.io/normal/bolt.jpg'

describe('CardArtPreview', () => {
  it('renders the card name', () => {
    render(<CardArtPreview name="Lightning Bolt" imageUrl={IMG} />)
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument()
  })

  it('shows the card image on hover and hides it on leave (mouse)', () => {
    render(<CardArtPreview name="Lightning Bolt" imageUrl={IMG} />)
    const anchor = screen.getByText('Lightning Bolt')
    expect(screen.queryByRole('img')).toBeNull() // lazy: no image until hovered

    fireEvent.pointerEnter(anchor, { pointerType: 'mouse', clientX: 20, clientY: 20 })
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', IMG)
    expect(img).toHaveAttribute('alt', 'Lightning Bolt')

    fireEvent.pointerLeave(anchor, { pointerType: 'mouse' })
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('shows on touch and dismisses on an outside tap (mobile)', () => {
    render(<CardArtPreview name="Lightning Bolt" imageUrl={IMG} />)
    const anchor = screen.getByText('Lightning Bolt')

    fireEvent.pointerDown(anchor, { pointerType: 'touch', clientX: 30, clientY: 30 })
    expect(screen.getByRole('img')).toBeInTheDocument()

    fireEvent.pointerDown(document.body, { pointerType: 'touch' })
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('is not dismissed by the opening tap reaching the document (mobile)', () => {
    // On real touch devices the pointerdown that opens the preview is still
    // bubbling to `document` when React registers the dismiss listener, so that
    // same tap would otherwise hide the preview instantly (net: nothing appears).
    // A pointerdown whose target is the card name must not dismiss the preview.
    render(<CardArtPreview name="Lightning Bolt" imageUrl={IMG} />)
    const anchor = screen.getByText('Lightning Bolt')

    fireEvent.pointerDown(anchor, { pointerType: 'touch', clientX: 30, clientY: 30 })
    expect(screen.getByRole('img')).toBeInTheDocument()

    // The opening gesture's pointerdown (target = the card name) reaches document.
    fireEvent.pointerDown(anchor, { pointerType: 'touch' })
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('is a no-op when there is no image URL', () => {
    render(<CardArtPreview name="Homebrew" imageUrl={null} />)
    const anchor = screen.getByText('Homebrew')
    fireEvent.pointerEnter(anchor, { pointerType: 'mouse', clientX: 10, clientY: 10 })
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renders the preview in a portal (document.body), not inline in the list', () => {
    const { container } = render(<CardArtPreview name="Lightning Bolt" imageUrl={IMG} />)
    fireEvent.pointerEnter(screen.getByText('Lightning Bolt'), { pointerType: 'mouse', clientX: 20, clientY: 20 })
    const img = screen.getByRole('img')
    // The image lives outside the component's own subtree (portalled to body),
    // so it cannot shift the decklist layout.
    expect(container.contains(img)).toBe(false)
  })

  it('previews from arbitrary children (an image-view tile), not just the name', () => {
    render(
      <CardArtPreview name="Lightning Bolt" imageUrl={IMG}>
        <span data-testid="tile">tile</span>
      </CardArtPreview>,
    )
    // The name is not rendered — the tile is the trigger.
    expect(screen.queryByText('Lightning Bolt')).toBeNull()
    fireEvent.pointerEnter(screen.getByTestId('tile'), { pointerType: 'mouse', clientX: 20, clientY: 20 })
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('renders children without preview behaviour when there is no image URL', () => {
    render(
      <CardArtPreview name="Homebrew" imageUrl={null}>
        <span data-testid="tile">placeholder</span>
      </CardArtPreview>,
    )
    const tile = screen.getByTestId('tile')
    fireEvent.pointerEnter(tile, { pointerType: 'mouse', clientX: 10, clientY: 10 })
    expect(screen.queryByRole('img')).toBeNull()
    expect(tile).toBeInTheDocument()
  })

  it('hides the preview if the image fails to load', () => {
    render(<CardArtPreview name="Lightning Bolt" imageUrl={IMG} />)
    fireEvent.pointerEnter(screen.getByText('Lightning Bolt'), { pointerType: 'mouse', clientX: 20, clientY: 20 })
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).toBeNull()
  })
})
