import isHotkey from 'is-hotkey';
import { Transforms, Node, Range, Editor } from 'slate';
import { getNodeType, isLastNode, getSelectedNodeByType, generateEmptyElement, generateElementInCustom } from '../../core';
import { getCodeBlockNodeEntry } from './helpers';
import { CODE_BLOCK, CODE_LINE, PARAGRAPH } from '../../constants/element-types';

const withCodeBlock = (editor) => {
  const { normalizeNode, insertFragment, insertText, insertBreak, insertData, insertNode, onHotKeyDown } = editor;
  const newEditor = editor;

  newEditor.insertData = (data) => {
    if (data.types.includes('text/code-block') && !getSelectedNodeByType(editor, CODE_BLOCK)) {
      const codeBlockNode = JSON.parse(data.getData('text/code-block'));
      return insertNode(codeBlockNode);
    }
    insertData(data);
  };

  newEditor.insertFragment = (data) => {
    // only selected code block content
    if (data.length === 1 && data[0].type === CODE_BLOCK && !getSelectedNodeByType(editor, CODE_BLOCK)) {
      data.forEach((node, index) => {
        if (node.type === CODE_BLOCK) {
          const newBlock = node.children.map(line => {
            const text = Node.string(line);
            const children = generateElementInCustom(PARAGRAPH, text);
            return children;
          });
          data.splice(index, 1, ...newBlock);
        }
      });
      return insertFragment(data);
    } else {
      if (getSelectedNodeByType(editor, CODE_BLOCK)) {
        // Paste into code block

        // Pasted data is code block split with code-line
        data.forEach((node, index) => {
          if (node.type === CODE_BLOCK) {
            const codeLineArr = node.children.map(line => line);
            data.splice(index, 1, ...codeLineArr);
          }
        });
        const newData = data.map(node => {
          const text = Node.string(node);
          const codeLine = generateElementInCustom(CODE_LINE, text);
          return codeLine;
        });

        // current focus code-line string not empty
        const string = Editor.string(newEditor, newEditor.selection.focus.path);
        if (string.length !== 0 && Range.isCollapsed(newEditor.selection)) {
          const [node, ...restNode] = newData;
          const text = Node.string(node);
          insertText(text);
          if (restNode.length !== 0) {
            insertBreak();
            insertFragment(restNode);
          }
          return;
        }
        return insertFragment(newData);
      } else {
        // Paste into not a code block
        return insertFragment(data);
      }
    }
  };

  // Rewrite normalizeNode
  newEditor.normalizeNode = ([node, path]) => {
    const type = getNodeType(node);

    if (type === CODE_LINE && path.length <= 1) {
      Transforms.setNodes(newEditor, { type: PARAGRAPH }, { at: path });
      return;
    }

    if (type === CODE_BLOCK) {
      if (node.children.length === 0) {
        Transforms.delete(newEditor, { at: path });
        return;
      }

      // code-block is the last node in the editor and needs to be followed by a p node
      const isLast = isLastNode(newEditor, node);
      if (isLast) {
        const paragraph = generateEmptyElement(PARAGRAPH);
        Transforms.insertNodes(newEditor, paragraph, { at: [path[0] + 1] });
      }

      // Here must be a code node below code-block
      if (getNodeType(node.children[0]) !== CODE_LINE) {
        Transforms.unwrapNodes(newEditor);
        Transforms.setNodes(newEditor, { type: PARAGRAPH }, { mode: 'highest' });
      }

      if (node.children.length > 1) {
        node.children.forEach((child, index) => {
          if (child.type !== CODE_LINE) {
            Transforms.setNodes(newEditor, { type: CODE_LINE }, { at: [...path, index] });
          }
        });
      }
    }

    // Perform default behavior
    return normalizeNode([node, path]);
  };

  newEditor.onHotKeyDown = (event) => {
    const wrapperCodeBlock = getCodeBlockNodeEntry(newEditor);
    if (!wrapperCodeBlock) return onHotKeyDown(event);

    if (isHotkey('mod+enter', event)) {
      event.preventDefault();
      if (newEditor.selection && !Range.isExpanded(newEditor.selection)) {
        const path = Editor.path(newEditor, newEditor.selection);
        const newParagraphPath = [path[0] + 1];
        const newParagraph = generateEmptyElement(PARAGRAPH);
        Transforms.insertNodes(newEditor, newParagraph, { at: newParagraphPath });
        Transforms.select(newEditor, newParagraphPath);
      }
    }

    if (isHotkey('tab', event)) {
      event.preventDefault();
      const nodeEntries = Editor.nodes(newEditor, {
        mode: 'lowest',
        match: node => node.type === CODE_LINE,
      });
      const nodeEntryList = Array.from(nodeEntries);
      for (const nodeEntry of nodeEntryList) {
        const [, path] = nodeEntry;
        // Insert 4 spaces for easier remove space
        Transforms.insertText(newEditor, ' '.repeat(4), { at: { path: [...path, 0], offset: 0 } });
      }
      const newRange = Editor.range(newEditor, nodeEntryList[0][1].concat(0), nodeEntryList.at(-1)[1].concat(0));
      nodeEntryList.length > 1 ? Transforms.select(newEditor, newRange) : Transforms.select(newEditor);
    }

    if (isHotkey('shift+tab', event)) {
      event.preventDefault();
      // Match the beginning of the line space, delete up to 4 spaces at a time
      const costomSelection = newEditor.selection;
      const matchBeginSpace = /^\s*/;
      const nodeEntries = Editor.nodes(newEditor, {
        mode: 'lowest',
        match: node => node.type === CODE_LINE,
      });
      const nodeEntryList = Array.from(nodeEntries);
      let removedSpaceCount = 0;

      for (const nodeEntry of nodeEntryList) {
        const [node, path] = nodeEntry;
        const spaceNum = Node.string(node).match(matchBeginSpace);
        // skip empty line and no space begining line
        if (!spaceNum || !spaceNum[0].length) continue;
        const deleteNum = Math.min(spaceNum[0].length, 4);
        removedSpaceCount += deleteNum;
        for (let i = 0; i < deleteNum; i++) {
          Transforms.select(newEditor, { path: [...path, 0], offset: 0 });
          Editor.deleteForward(newEditor, { unit: 'character' });
        }
      }
      // Select multiple rows when operating more then one line
      // Keep cursor location when operating one line
      if (nodeEntryList.length > 1) {
        const selectLocation = Editor.range(newEditor, nodeEntryList[0][1].concat(0), nodeEntryList.at(-1)[1].concat(0));
        Transforms.select(newEditor, selectLocation);
      } else {
        const { anchor, focus } = costomSelection;
        const isCollapsed = Range.isCollapsed(costomSelection);
        if (isCollapsed) {
          const selectLocation = { ...costomSelection.focus, offset: costomSelection.focus.offset - removedSpaceCount };
          Transforms.select(newEditor, selectLocation);
        } else {
          const selectLocation = {
            anchor: { ...anchor, offset: anchor.offset - removedSpaceCount },
            focus: { ...focus, offset: focus.offset - removedSpaceCount }
          };
          Transforms.select(newEditor, selectLocation);
        }
      }
    }

    if (isHotkey('mod+a', event)) {
      event.preventDefault();
      const codeBlockEntry = Editor.nodes(newEditor, {
        mode: 'highest',
        match: node => node.type === CODE_BLOCK,
      });
      if (!codeBlockEntry) return;
      const codeBlockEntryList = Array.from(...codeBlockEntry);
      Transforms.select(newEditor, codeBlockEntryList[1]);
    }
  };

  return newEditor;
};

export default withCodeBlock;
