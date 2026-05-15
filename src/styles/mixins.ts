import { css } from 'styled-components';

/**
 * Opts a text element back in to user selection. Apply to song titles, artist
 * names, album names, paths, and any other content that users might want to
 * copy. The global body rule disables selection by default for a native feel
 * (no blue selection boxes when dragging across the UI chrome).
 */
export const selectable = css`
  user-select: text;
  -webkit-user-select: text;
`;
