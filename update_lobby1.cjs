const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `const LobbyUI = ({ roomCode, onLeave }: { roomCode: string, onLeave: () => void }) => {
  const { players, isHost, myId, mapId, matchDuration, toggleSettings, showSettings } = useGameStore();
  const [showOptions, setShowOptions] = React.useState(false);

  const handleStartMatch = () => {`;

const replacement = `const LobbyUI = ({ roomCode, onLeave }: { roomCode: string, onLeave: () => void }) => {
  const { players, isHost, myId, mapId, matchDuration, toggleSettings, showSettings } = useGameStore();
  const [showOptions, setShowOptions] = React.useState(false);
  const [mapError, setMapError] = React.useState('');
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, playerId: string } | null>(null);

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleStartMatch = () => {`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
