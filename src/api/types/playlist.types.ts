/**
 * Типы для работы с плейлистами
 */

export interface PlaylistContent {
    contentUUID: string;
    contentName: string;
    coverUUID: string;
    fileUUID: string;
    fileType: string;
    contentType: string;
    contentWidth: number;
    contentHeight: number;
    contentSize: number;
    contentDuration: number;
}

export type PlaylistContentsResponse = PlaylistContent[];

