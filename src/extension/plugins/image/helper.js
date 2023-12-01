import { Transforms } from 'slate';
import slugid from 'slugid';
import { getHeaderType } from '../header/helper';
import { IMAGE } from '../../constants/element-types';
import { generateDefaultText, getNodeType } from '../../core';
import { isInCodeBlock } from '../code-block/helpers';

export const isMenuDisabled = (editor, readonly) => {
  if (readonly) return true;
  const isHeader = getHeaderType(editor);
  if (isHeader) return true;
  if (isInCodeBlock(editor)) return true;
  return false;
};

export const insertImage = (editor, url) => {
  const imageNode = {
    type: IMAGE,
    id: slugid.nice(),
    data: {
      src: url,
    },
    children: [generateDefaultText()]
  };
  Transforms.insertNodes(editor, imageNode, { at: editor.selection, select: true });
};

export const updateImage = (editor, data) => {
  Transforms.setNodes(editor, { data }, {
    match: (n) => getNodeType(n) === IMAGE,
    at: editor.selection,
    voids: true
  });
};

export const getImagesUrlList = (nodes) => {
  let nodeIndex = 0;
  const list = [];
  while (nodes && nodeIndex <= nodes.length - 1) {
    const currentNode = nodes[nodeIndex];
    if (currentNode.type === IMAGE) {
      const { data = {} } = currentNode;
      data.src && list.push(data.src);
    } else {
      list.push(...getImagesUrlList(currentNode.children));
    }
    nodeIndex++;
  }
  return list;
};
