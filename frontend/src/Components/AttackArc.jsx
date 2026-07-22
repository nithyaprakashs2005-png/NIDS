import React from 'react';

const AttackArc = ({ 
    from = { x: 0, y: 0 }, 
    to = { x: 0, y: 0 }, 
    color = '#00F0FF', 
    status = 'idle', // 'idle' | 'active' | 'success' | 'blocked'
    duration = 1.5
}) => {
    if (status === 'idle') return null;

    // Calculate middle point for the curve
    const midX = (from.x + to.x) / 2;
    const midY = Math.min(from.y, to.y) - 50; // Curve upwards
    
    const pathData = `M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`;
    
    // Success/Block points
    const interceptX = status === 'blocked' ? (from.x + midX) / 2 : to.x;
    const interceptY = status === 'blocked' ? (from.y + midY) / 2 : to.y;

    const strokeColor = status === 'success' ? '#10B981' : (status === 'blocked' ? '#EF4444' : color);

    return (
        <g>
            {/* The Path */}
            <path
                d={pathData}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeDasharray="1000"
                strokeDashoffset="1000"
                opacity="0.6"
                style={{
                    filter: `drop-shadow(0 0 5px ${strokeColor})`,
                    animation: `dash ${duration}s ease-out forwards`
                }}
            />

            {/* Traveling Particle */}
            <circle r="4" fill="#FFF">
                <animateMotion 
                    path={pathData} 
                    dur={`${duration}s`} 
                    rotate="auto" 
                    repeatCount="1"
                    keyPoints={status === 'blocked' ? "0;0.5" : "0;1"}
                    keyTimes="0;1"
                    calcMode="linear"
                    fill="freeze"
                />
                <animate 
                    attributeName="fill" 
                    values={`#FFF;${strokeColor}`} 
                    dur="0.2s" 
                    begin={`${duration}s`} 
                    fill="freeze" 
                />
            </circle>

            {/* Impact Ripple */}
            {(status === 'success' || status === 'blocked') && (
                <circle cx={interceptX} cy={interceptY} r="0" fill="none" stroke={strokeColor} strokeWidth="2">
                    <animate 
                        attributeName="r" 
                        from="0" to="30" 
                        dur="1s" 
                        begin={`${duration}s`} 
                        repeatCount="indefinite" 
                    />
                    <animate 
                        attributeName="opacity" 
                        from="1" to="0" 
                        dur="1s" 
                        begin={`${duration}s`} 
                        repeatCount="indefinite" 
                    />
                </circle>
            )}

            <style>{`
                @keyframes dash {
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
        </g>
    );
};

export default AttackArc;
