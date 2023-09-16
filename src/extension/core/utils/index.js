import slugid from 'slugid';

export const match = (node, path, predicate) => {
  if (!predicate) return true;

  if (typeof predicate === 'object') {
    return Object.entries(predicate).every(([key, value]) => {
      if (value && !Array.isArray(value)) {
        return node[key] === value;
      }

      value = value ? value : [];
      return value.includes(node[key]);
    });
  }

  return predicate(node, path);
};

export const generateDefaultText = () => {
  return { id: slugid.nice(), text: '' };
};

export const generateEmptyElement = (type) => {
  return {id: slugid.nice(), type, children: [ generateDefaultText() ]};
};

export const isEmptyParagraph = (node) => {
  if (node.type !== 'paragraph') return false;
  if (node.children.length !== 1) return false;
  const [child] = node.children;
  if (Text.isText(child) && child.text === '' && child.type !== 'image') return true;
  return false;
};
