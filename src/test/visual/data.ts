import { MetadataType } from '../../types';
// Fictional metadata for visual comparison; no files are added to a user's library.
const svg = (body: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">${body}</svg>`)}`;
const art = [
  svg(
    '<rect width="400" height="400" fill="#d4e1c7"/><circle cx="280" cy="350" r="195" fill="none" stroke="#a5b59a" stroke-width="24"/><circle cx="280" cy="350" r="165" fill="none" stroke="#537b68" stroke-width="40"/><text x="25" y="65" font-family="Arial" font-size="49" font-weight="bold" fill="#183c33">ENTRE<tspan x="25" dy="51">ONDAS</tspan></text><text x="25" y="375" font-size="9" font-family="Arial" letter-spacing="2" fill="#183c33">SESSÕES DO ATLÂNTICO</text>',
  ),
  svg(
    '<defs><radialGradient id="orb" cx="35%" cy="30%"><stop stop-color="#c5c4e3"/><stop offset="1" stop-color="#383754"/></radialGradient></defs><rect width="400" height="400" fill="#68759f"/><circle cx="235" cy="350" r="230" fill="url(#orb)"/><text x="25" y="65" font-family="Arial" font-size="49" font-weight="bold" fill="#f0d6bb">blue</text><text x="25" y="115" font-family="Georgia" font-size="52" font-style="italic" fill="#f0d6bb">hour.</text>',
  ),
  svg(
    '<rect width="400" height="400" fill="#d96c39"/>' +
      Array.from(
        { length: 11 },
        (_, i) => `<circle cx="350" cy="400" r="${25 + i * 29}" fill="none" stroke="#2b2424" stroke-width="6"/>`,
      ).join('') +
      '<text x="25" y="55" font-family="Arial" font-size="31" font-weight="bold" fill="#2d2221">O LADO<tspan x="25" dy="34">DE DENTRO</tspan></text><text x="25" y="375" font-size="9" font-family="Arial" letter-spacing="2" fill="#2d2221">ESTÚDIO ABERTO</text>',
  ),
  svg(
    '<defs><pattern id="rain" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><path d="M0 0V30" stroke="#9ca4a7" stroke-opacity=".3" stroke-width="3"/></pattern></defs><rect width="400" height="400" fill="#292b35"/><rect width="400" height="400" fill="url(#rain)"/><text x="25" y="65" font-family="Arial" font-size="49" font-weight="bold" fill="#dfddc8">AFTER<tspan x="25" dy="49">THE</tspan><tspan x="25" dy="49">RAIN</tspan></text>',
  ),
];
export const library: MetadataType[] = ['Entre ondas', 'Blue hour', 'O lado de dentro', 'After the rain'].map(
  (album, i) => ({
    album,
    artist: ['Maré Alta', 'Íris', 'Estúdio Aberto', 'Slow Motion'][i],
    title: i ? album : 'Um lugar para voltar',
    image: art[i],
    path: `/visual/${i}.mp3`,
    duration: { duration_seconds: 222, duration_formatted: '3:42' },
  }),
);
