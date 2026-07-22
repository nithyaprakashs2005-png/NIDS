import React from 'react';

// Simplified World Map SVG Path (Low detail for performance and SOC aesthetic)
const MAP_PATH = "M50,150 L150,150 L180,100 L250,100 L300,50 L400,50 L450,100 L550,100 L600,150 L750,150 L850,250 L850,450 L750,550 L600,550 L500,450 L300,450 L150,550 L50,550 Z";

export const COUNTRIES_DATA = [
    { id: 'US', name: 'United States', x: 200, y: 190, flag: '🇺🇸', ip: '52.14' },
    { id: 'BR', name: 'Brazil', x: 320, y: 400, flag: '🇧🇷', ip: '200.18' },
    { id: 'GB', name: 'United Kingdom', x: 440, y: 140, flag: '🇬🇧', ip: '62.24' },
    { id: 'DE', name: 'Germany', x: 480, y: 150, flag: '🇩🇪', ip: '81.169' },
    { id: 'FR', name: 'France', x: 460, y: 165, flag: '🇫🇷', ip: '92.103' },
    { id: 'RU', name: 'Russia', x: 650, y: 130, flag: '🇷🇺', ip: '94.102' },
    { id: 'CN', name: 'China', x: 720, y: 180, flag: '🇨🇳', ip: '202.91' },
    { id: 'IN', name: 'India', x: 660, y: 220, flag: '🇮🇳', ip: '103.21' },
    { id: 'JP', name: 'Japan', x: 800, y: 180, flag: '🇯🇵', ip: '114.160' },
    { id: 'KP', name: 'North Korea', x: 770, y: 175, flag: '🇰🇵', ip: '175.45' },
    { id: 'AU', name: 'Australia', x: 780, y: 450, flag: '🇦🇺', ip: '1.0' },
];

const WorldMapSVG = ({ 
    mode = 'decorative', 
    onCountryClick, 
    selectedId,
    style = {}
}) => {
    return (
        <svg 
            viewBox="0 0 1000 600" 
            style={{ width: '100%', height: 'auto', ...style }}
            className="world-map-svg"
        >
            {/* Dark background silhouette */}
            <path 
                d={MAP_PATH} 
                fill="rgba(0, 240, 255, 0.05)" 
                stroke="rgba(0, 240, 255, 0.1)"
                strokeWidth="1"
            />
            
            {/* Country nodes */}
            {COUNTRIES_DATA.map(c => (
                <g 
                    key={c.id} 
                    onClick={() => mode === 'interactive' && onCountryClick?.(c)}
                    style={{ cursor: mode === 'interactive' ? 'pointer' : 'default' }}
                >
                    <circle 
                        cx={c.x} 
                        cy={c.y} 
                        r={selectedId === c.id ? 6 : 3} 
                        fill={selectedId === c.id ? '#EF4444' : '#00F0FF'}
                        className="country-node"
                        style={{
                            transition: 'all 0.3s ease',
                            filter: selectedId === c.id ? 'drop-shadow(0 0 8px #EF4444)' : 'none'
                        }}
                    >
                        {mode === 'interactive' && (
                            <animate 
                                attributeName="r" 
                                values={selectedId === c.id ? "6;10;6" : "3;5;3"} 
                                dur="2s" 
                                repeatCount="indefinite" 
                            />
                        )}
                    </circle>
                    
                    {/* Tooltip text (only in interactive) */}
                    {mode === 'interactive' && (
                        <text 
                            x={c.x + 8} 
                            y={c.y + 4} 
                            fill="rgba(0, 240, 255, 0.6)" 
                            fontSize="10"
                            fontFamily="'DM Mono', monospace"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                            {c.id}
                        </text>
                    )}
                </g>
            ))}

            <style>{`
                .world-map-svg {
                    overflow: visible;
                }
                .country-node:hover {
                    r: 8 !important;
                    fill: #FFF !important;
                }
            `}</style>
        </svg>
    );
};

export default WorldMapSVG;
