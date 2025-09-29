'use client';

import * as React from 'react';
import { AreaChart, Area, ResponsiveContainer, ReferenceLine, XAxis, YAxis } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import type { DocumentVersionData } from '@/types/document-version';

interface VersionRailProps {
    versions: DocumentVersionData[];
    currentIndex: number;
    onIndexChange: (index: number) => void;
    baseDocumentId: string;
    isLoading?: boolean;
    refreshVersions?: () => void;
}

export function VersionRail({ versions, currentIndex, onIndexChange, baseDocumentId, isLoading }: VersionRailProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [localVersions, setLocalVersions] = React.useState<DocumentVersionData[]>([]);
    const [currentContent, setCurrentContent] = React.useState<string>('');
    const [isPreviewMode, setIsPreviewMode] = React.useState(false);
    const [previewPosition, setPreviewPosition] = React.useState<number | null>(null);

    const expandTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const collapseTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const dragStartIndexRef = React.useRef<number | null>(null);
    const lastSavedContentRef = React.useRef<string>('');

    // Create activity timeline data for the graph
    const activityData = React.useMemo(() => {
        const dataPoints: Array<{
            time: number;
            activity: number;
            version?: DocumentVersionData;
            timestamp: Date;
        }> = [];

        // Start with server versions
        versions.forEach((version, index) => {
            dataPoints.push({
                time: index,
                activity: 10, // Base activity for saved versions
                version,
                timestamp: new Date(version.createdAt)
            });
        });

        // Add local draft activity
        localVersions.forEach((version, index) => {
            const baseIndex = versions.length + index;
            const prevContent = index === 0 ? (versions[versions.length - 1]?.content || '') : (localVersions[index - 1]?.content || '');
            const activity = Math.min(50, Math.max(5, (version.content || '').length - prevContent.length));

            dataPoints.push({
                time: baseIndex,
                activity,
                version,
                timestamp: new Date(version.createdAt)
            });
        });

        // Add current position if we have content
        if (currentContent.trim()) {
            const prevContent = localVersions[localVersions.length - 1]?.content || versions[versions.length - 1]?.content || '';
            const activity = Math.min(50, Math.max(5, currentContent.length - prevContent.length));

            dataPoints.push({
                time: dataPoints.length,
                activity,
                version: {
                    id: 'current-draft',
                    title: 'Current Draft',
                    content: currentContent,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    version: 0
                },
                timestamp: new Date()
            });
        }

        return dataPoints;
    }, [versions, localVersions, currentContent]);

    // Find the current position in the timeline
    const currentPosition = activityData.length - 1;


    // Track editor changes for offline versioning
    React.useEffect(() => {
        let versionCreationTimeout: NodeJS.Timeout | null = null;

        const handleEditorChange = (event: CustomEvent) => {
            const { documentId: changedDocId, content } = event.detail;
            if (changedDocId === baseDocumentId && content !== lastSavedContentRef.current) {
                // Debounce version creation to avoid too many versions
                if (versionCreationTimeout) {
                    clearTimeout(versionCreationTimeout);
                }

                versionCreationTimeout = setTimeout(() => {
                    // Create a local version snapshot
                    const now = new Date();
                    const localVersion: DocumentVersionData = {
                        id: `local-${Date.now()}`,
                        title: 'Current Draft',
                        content,
                        createdAt: now,
                        updatedAt: now,
                        version: 0, // Local drafts don't have a version number
                    };

                    setLocalVersions(prev => {
                        // Keep only the last 10 local versions to avoid clutter
                        const newVersions = [localVersion, ...prev.slice(0, 9)];
                        // Save to localStorage for offline persistence
                        try {
                            localStorage.setItem(`versions-${baseDocumentId}`, JSON.stringify(newVersions));
                        } catch (error) {
                            console.warn('Failed to save local versions:', error);
                        }
                        return newVersions;
                    });

                    lastSavedContentRef.current = content;
                }, 2000); // Create version every 2 seconds of typing pauses
            }
        };

        // Load saved local versions on mount
        try {
            const saved = localStorage.getItem(`versions-${baseDocumentId}`);
            if (saved) {
                setLocalVersions(JSON.parse(saved));
            }
        } catch (error) {
            console.warn('Failed to load local versions:', error);
        }

        const handleContentUpdate = (event: CustomEvent) => {
            const { documentId: docId, content } = event.detail;
            if (docId === baseDocumentId) {
                setCurrentContent(content || '');
            }
        };

        window.addEventListener('editor:content-changed', handleEditorChange as EventListener);
        window.addEventListener('editor:content-changed', handleContentUpdate as EventListener);

        return () => {
            window.removeEventListener('editor:content-changed', handleEditorChange as EventListener);
            window.removeEventListener('editor:content-changed', handleContentUpdate as EventListener);
            if (versionCreationTimeout) {
                clearTimeout(versionCreationTimeout);
            }
            if (expandTimeoutRef.current) {
                clearTimeout(expandTimeoutRef.current);
            }
            if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current);
            }
        };
    }, [baseDocumentId]);


    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (expandTimeoutRef.current) {
                clearTimeout(expandTimeoutRef.current);
            }
            if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current);
            }
        };
    }, []);

    const navigateToPosition = React.useCallback(
        (position: number) => {
            if (position < 0 || position >= activityData.length) return;

            const dataPoint = activityData[position];
            if (dataPoint?.version) {
                // If it's the current position, cancel preview mode
                if (position === currentPosition) {
                    setIsPreviewMode(false);
                    setPreviewPosition(null);
                    window.dispatchEvent(
                        new CustomEvent('cancel-document-update', {
                            detail: { documentId: baseDocumentId },
                        })
                    );
                } else {
                    // Show preview of the selected version
                    setIsPreviewMode(true);
                    setPreviewPosition(position);
                    window.dispatchEvent(
                        new CustomEvent('preview-document-update', {
                            detail: { documentId: baseDocumentId, newContent: dataPoint.version.content },
                        })
                    );
                }
            }
        },
        [activityData, baseDocumentId, currentPosition]
    );

    const confirmDestructiveChange = React.useCallback(() => {
        if (previewPosition !== null) {
            const dataPoint = activityData[previewPosition];
            if (dataPoint?.version) {
                const revertedContent = dataPoint.version.content || '';

                // Update the editor content directly by dispatching an event that the editor listens for
                window.dispatchEvent(new CustomEvent('editor:force-content-update', {
                    detail: { documentId: baseDocumentId, content: revertedContent }
                }));

                // Clear local versions and update current content
                setLocalVersions([]);
                setCurrentContent(revertedContent);
                lastSavedContentRef.current = revertedContent;

                // Save to server
                fetch('/api/document', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: baseDocumentId,
                        content: revertedContent,
                    }),
                }).catch(error => {
                    console.error('Failed to save destructive change:', error);
                });
            }
        }
        setIsPreviewMode(false);
        setPreviewPosition(null);
    }, [previewPosition, activityData, baseDocumentId]);

    const cancelPreview = React.useCallback(() => {
        setIsPreviewMode(false);
        setPreviewPosition(null);
        navigateToPosition(currentPosition);
    }, [currentPosition, navigateToPosition]);

    // Render confirmation overlay globally when in preview mode
    React.useEffect(() => {
        const overlayContainer = document.getElementById('preview-confirmation-overlay');
        if (!overlayContainer) return;

        if (isPreviewMode) {
            overlayContainer.innerHTML = `
                <div class="absolute inset-0 pointer-events-none">
                    <div class="absolute bottom-16 right-1 bg-background border rounded-sm shadow-lg px-2 py-1.5 flex items-center gap-2 text-xs pointer-events-auto">
                        <span class="font-medium">Revert to this version?</span>
                        <button id="cancel-preview" class="px-2 py-1 bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded">
                            ✕
                        </button>
                        <button id="confirm-destructive-change" class="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200 border border-green-200 dark:border-green-800 transition-colors duration-200 rounded font-medium">
                            ✓
                        </button>
                    </div>
                </div>
            `;

            // Add event listeners
            const confirmBtn = document.getElementById('confirm-destructive-change');
            const cancelBtn = document.getElementById('cancel-preview');

            if (confirmBtn) {
                confirmBtn.onclick = confirmDestructiveChange;
            }
            if (cancelBtn) {
                cancelBtn.onclick = cancelPreview;
            }
        } else {
            overlayContainer.innerHTML = '';
        }

        return () => {
            if (overlayContainer) {
                overlayContainer.innerHTML = '';
            }
        };
    }, [isPreviewMode, confirmDestructiveChange, cancelPreview]);

    const handlePointerEnter = React.useCallback(() => {
        // Clear any pending collapse timeout
        if (collapseTimeoutRef.current) {
            clearTimeout(collapseTimeoutRef.current);
            collapseTimeoutRef.current = null;
        }
        // Set expand timeout (only if not already expanded)
        if (!isExpanded && !expandTimeoutRef.current) {
            expandTimeoutRef.current = setTimeout(() => {
                setIsExpanded(true);
                expandTimeoutRef.current = null;
            }, 200); // Small delay to prevent flickering
        }
    }, [isExpanded]);

    const handlePointerLeave = React.useCallback(() => {
        // Clear any pending expand timeout
        if (expandTimeoutRef.current) {
            clearTimeout(expandTimeoutRef.current);
            expandTimeoutRef.current = null;
        }
        // Set collapse timeout
        collapseTimeoutRef.current = setTimeout(() => {
            setIsExpanded(false);
            setHoveredIndex(null);
            collapseTimeoutRef.current = null;
        }, 1000); // Longer delay before collapsing for smoother UX
    }, []);


    const getPositionFromMousePosition = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const fraction = x / rect.width;
        return Math.min(Math.max(Math.round(fraction * (activityData.length - 1)), 0), activityData.length - 1);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const position = getPositionFromMousePosition(e);
        setIsDragging(true);
        dragStartIndexRef.current = position;
        navigateToPosition(position);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging) {
            const position = getPositionFromMousePosition(e);
            navigateToPosition(position);
        } else if (isExpanded && activityData.length > 0) {
            const position = getPositionFromMousePosition(e);
            setHoveredIndex(position);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        dragStartIndexRef.current = null;
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only handle click if we didn't just finish dragging
        if (!isDragging && dragStartIndexRef.current === null) {
            const position = getPositionFromMousePosition(e);
            navigateToPosition(position);
        }
    };

    if (isLoading || activityData.length === 0) {
        return <div className="w-full border-b bg-background h-1" />;
    }


    return (
        <div className="w-full">
            {/* Timeline container */}
            <div
                className={`version-rail-container w-full border-b bg-background transition-all duration-300 relative ${isExpanded ? 'h-12' : 'h-1'} ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Activity waveform graph */}
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={[0, 'dataMax']} />
                        <Area
                            type="monotone"
                            dataKey="activity"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                        {/* Current position indicator - fixed at end */}
                        <ReferenceLine
                            x={activityData.length - 1}
                            stroke="#10b981"
                            strokeWidth={3}
                            strokeDasharray="5,5"
                        />
                        {/* Preview position indicator */}
                        {isPreviewMode && previewPosition !== null && (
                            <ReferenceLine
                                x={previewPosition}
                                stroke="#1d4ed8"
                                strokeWidth={2}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>

                {/* Interactive overlay for tooltips and clicks */}
                {isExpanded && (
                    <div className="absolute inset-0">
                        {activityData.map((dataPoint, index) => {
                            const isHovered = hoveredIndex === index;
                            const isCurrent = index === currentPosition;

                            return (
                                <div
                                    key={index}
                                    className="absolute inset-y-0 cursor-pointer"
                                    style={{
                                        left: `${(index / Math.max(activityData.length - 1, 1)) * 100}%`,
                                        width: `${100 / Math.max(activityData.length, 1)}%`,
                                    }}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigateToPosition(index);
                                    }}
                                >
                                    {/* Tooltip */}
                                    {isHovered && dataPoint.version && (
                                        <div
                                            className={`absolute bg-background border px-2 py-1 text-xs rounded shadow-md z-20 whitespace-nowrap ${index === 0
                                                ? 'left-0 -bottom-10'
                                                : index === activityData.length - 1
                                                    ? 'right-0 -bottom-10'
                                                    : 'left-1/2 -translate-x-1/2 -bottom-10'
                                                }`}
                                        >
                                            <div className="text-xs">
                                                {formatDistanceToNow(dataPoint.timestamp, { addSuffix: true })}
                                                {isCurrent && <span className="ml-1 text-green-500">(now)</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

