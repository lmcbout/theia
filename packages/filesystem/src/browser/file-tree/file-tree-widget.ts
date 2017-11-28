/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { h } from "@phosphor/virtualdom";
import {
    ContextMenuRenderer, VirtualRenderer,
    TreeWidget, NodeProps, TreeProps, ITreeNode
} from "@theia/core/lib/browser";
import { ElementAttrs } from "@phosphor/virtualdom";
import { DirNode, FileStatNode } from "./file-tree";
import { FileTreeModel } from "./file-tree-model";
import { FileSystem } from '../../common';
import * as base64 from 'base64-js';

export const FILE_TREE_CLASS = 'theia-FileTree';
export const FILE_STAT_NODE_CLASS = 'theia-FileStatNode';
export const DIR_NODE_CLASS = 'theia-DirNode';
export const FILE_STAT_ICON_CLASS = 'theia-FileStatIcon';
export const DROPZONE_CLASS = 'theia-Dropzone';
const activeDropZone = "activeDropZone";

@injectable()
export class FileTreeWidget extends TreeWidget {

    constructor(
        @inject(FileSystem) protected readonly fileSystem: FileSystem,
        @inject(TreeProps) readonly props: TreeProps,
        @inject(FileTreeModel) readonly model: FileTreeModel,
        @inject(ContextMenuRenderer) contextMenuRenderer: ContextMenuRenderer
    ) {
        super(props, model, contextMenuRenderer);
        this.addClass(FILE_TREE_CLASS);
    }

    protected createNodeClassNames(node: ITreeNode, props: NodeProps): string[] {
        const classNames = super.createNodeClassNames(node, props);
        if (FileStatNode.is(node)) {
            classNames.push(FILE_STAT_NODE_CLASS);
        }
        if (DirNode.is(node)) {
            classNames.push(DIR_NODE_CLASS);
            classNames.push(DROPZONE_CLASS);
        }
        return classNames;
    }

    protected decorateCaption(node: ITreeNode, caption: h.Child, props: NodeProps): h.Child {
        if (FileStatNode.is(node)) {
            return this.decorateFileStatCaption(node, caption, props);
        }
        return super.decorateCaption(node, caption, props);
    }

    protected decorateFileStatCaption(node: FileStatNode, caption: h.Child, props: NodeProps): h.Child {
        const icon = h.span({
            className: (node.icon || '') + ' file-icon'
        });
        return super.decorateCaption(node, VirtualRenderer.merge(icon, caption), props);
    }
    protected createNodeAttributes(node: ITreeNode, props: NodeProps): ElementAttrs {
        const elementAttrs: ElementAttrs = super.createNodeAttributes(node, props);
        const childExpansion = this.isExandable(node) ? 0 : 1;

        if (!childExpansion) {
            // Folder, so it could be a dropzone
            return {
                ...elementAttrs,
                ondragenter: event => this.handleDragEnterEvent(node, event),
                ondrop: event => this.handleDropEvent(node, event),
                ondragover: event => this.handleDragOverEvent(node, event),
                ondragleave: event => {
                    const target = event.target as HTMLElement;
                    if (target.parentElement) {
                        target.parentElement.classList.remove(activeDropZone);
                    }
                },
            };
        }
        return elementAttrs;
    }

    protected handleDragEnterEvent(node: ITreeNode, event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        const target = event.target as HTMLElement;
        if (target.parentElement) {
            target.parentElement.classList.add(activeDropZone);
        }
    }
    protected handleDragOverEvent(node: ITreeNode, event: DragEvent): void {
        event.preventDefault();
    }

    protected handleDropEvent(node: ITreeNode, event: DragEvent): void {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
        const target = event.target as HTMLElement;
        if (target.parentElement) {
            target.parentElement.classList.remove(activeDropZone);
        }

        this.dropHandler(event, node);
    }

    protected dropHandler(ev: DragEvent, node: ITreeNode) {
        ev.preventDefault();
        const data = ev.dataTransfer.items;

        for (let i = 0; i < data.length; i += 1) {
            if (data[i].kind === 'file') {
                const entry: WebKitEntry = data[i].webkitGetAsEntry();

                if (entry.isDirectory) {
                    this.handleDirectory(entry, node.id);
                } else {
                    const f: any = data[i].getAsFile();
                    this.buildAndSendData(node.id, f, f.name);
                }
            }
        }
    }

    protected handleDirectory(webDirEntry: WebKitEntry, dest: string) {

        const getEntries = (dirEntry: any, destination: string) => {
            const reader = dirEntry.createReader();
            reader.readEntries((e: any) => {
                const results = <WebKitEntry[]>e;

                for (let count = 0; count < results.length; count++) {

                    if (results[count].isDirectory) {
                        getEntries(results[count], destination);
                    } else {
                        const fileEntry = <WebKitFileEntry>results[count];
                        fileEntry.file(e => {
                            const f = <File>(e as {});
                            this.buildAndSendData(destination + dirEntry.fullPath, f, f.name);
                        });
                    }
                }
            }, (error: any) => {
                console.error("Error: " + error);
            });
        };
        getEntries(webDirEntry, dest);
    }

    protected buildAndSendData(destination: string, file: File, fileName: string) {
        // const options = { encoding: "base64" };
        const fileToCreate = destination + "/" + fileName;
        this.fileSystem.exists(fileToCreate).then(exist => {
            console.log("--JBJB Folder exist or not: " + exist + "\t toCreate in folder: " + fileToCreate);
            this.fileSystem.createFile(fileToCreate).then(() => {
                console.log("--JB file created" + fileToCreate);

                // Saving contents
                this.fileSystem.getFileStat(fileToCreate).then(currentStat => {
                    console.log("--JB Get the content from: " + file);
                    const reader = new FileReader();

                    reader.onload = e => {
                        const fileContent: ArrayBuffer = reader.result;
                        console.log("--JBJB data: \n", fileContent);
                        const buffer64 = base64.fromByteArray(new Uint8Array(fileContent));
                        // const objJsonStr = new Buffer(fileContent);
                        // this.fileSystem.setContent(currentStat, objJsonStr.toString()).then(() => Promise.resolve());
                        // this.fileSystem.setContent(currentStat, fileContent).then(() => Promise.resolve());
                        // this.fileSystem.setContent(currentStat, fileContent, options).then(() => Promise.resolve());
                        // this.fileSystem.setContent(currentStat, fileContent).then(() => Promise.resolve());
                        this.fileSystem.setContentBase64(currentStat, buffer64).then(() => Promise.resolve());

                    };
                    console.log("--JB reading -----");
                    // reader.readAsDataURL(file);
                    // reader.readAsText(file);
                    reader.readAsArrayBuffer(file);
                    // reader.readAsText(file, "base64");
                });
            },
                (error: Error) => {
                    console.error("----- Error: " + error.message);
                });
        });
    }

}
