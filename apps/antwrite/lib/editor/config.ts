import { textblockTypeInputRule } from 'prosemirror-inputrules';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import OrderedMap from 'orderedmap';
import { DiffType } from './diff';

const diffMarkSpec = {
  attrs: { type: { default: '' } },
  toDOM(mark: any) {
    let className = '';
    switch (mark.attrs.type) {
      case DiffType.Inserted:
        className =
          'bg-green-100 text-green-700 dark:bg-green-500/70 dark:text-green-300';
        break;
      case DiffType.Deleted:
        className =
          'bg-red-100 line-through text-red-600 dark:bg-red-500/70 dark:text-red-300';
        break;
      default:
        className = '';
    }
    return ['span', { class: className, 'data-diff': mark.attrs.type }, 0];
  },
};

const underlineMarkSpec = {
  parseDOM: [{ tag: 'u' }],
  toDOM() { return ['u', 0] },
};

const strikeMarkSpec = {
  parseDOM: [{ tag: 's' }, { tag: 'strike' }, { style: 'text-decoration=line-through' }],
  toDOM() { return ['s', 0] },
}

const fontSizeMarkSpec = {
  attrs: {
    fontSize: {},
  },
  toDOM(mark: any) {
    return ['span', { style: `font-size: ${mark.attrs.fontSize}` }, 0];
  },
  parseDOM: [
    {
      style: 'font-size',
      getAttrs(value: any) {
        return { fontSize: value };
      },
    },
  ],
};

const fontFamilyMarkSpec = {
  attrs: {
    fontFamily: {},
  },
  toDOM(mark: any) {
    return ['span', { style: `font-family: ${mark.attrs.fontFamily}` }, 0];
  },
  parseDOM: [
    {
      style: 'font-family',
      getAttrs(value: any) {
        return { fontFamily: value };
      },
    },
  ],
};

const textColorMarkSpec = {
  attrs: {
    color: { default: '#000000' },
  },
  toDOM(mark: any) {
    return ['span', { style: `color: ${mark.attrs.color}` }, 0];
  },
  parseDOM: [
    {
      style: 'color',
      getAttrs(value: any) {
        return { color: value };
      },
    },
  ],
};

const imageNodeSpec = {
  attrs: {
    src: {},
    alt: { default: null },
    title: { default: null },
    align: { default: 'left' }, // 'left', 'center', 'right'
  },
  inline: false, // Changed to block to allow centering
  group: 'block',
  draggable: true,
  toDOM(node: any): any {
    const classes = ['max-w-full h-auto rounded-md'];
    if (node.attrs.align === 'center') classes.push('mx-auto block');
    else if (node.attrs.align === 'right') classes.push('ml-auto block');
    else classes.push('block'); // left align

    return ['img', {
      src: node.attrs.src,
      alt: node.attrs.alt || '',
      title: node.attrs.title,
      class: classes.join(' '),
      'data-align': node.attrs.align,
    }];
  },
  parseDOM: [{
    tag: 'img[src]',
    getAttrs(dom: any) {
      return {
        src: dom.getAttribute('src'),
        alt: dom.getAttribute('alt') || '',
        title: dom.getAttribute('title'),
        align: dom.getAttribute('data-align') || 'left',
      };
    },
  }],
};

export const documentSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes.addToEnd('image', imageNodeSpec), 'paragraph block*', 'block'),
  marks: OrderedMap.from({
    ...schema.spec.marks.toObject(),
    diffMark: diffMarkSpec as any,
    underline: underlineMarkSpec,
    strike: strikeMarkSpec,
    fontSize: fontSizeMarkSpec,
    fontFamily: fontFamilyMarkSpec,
    textColor: textColorMarkSpec,
  }),
});

export function headingRule(level: number) {
  return textblockTypeInputRule(
    new RegExp(`^(#{1,${level}})\\s$`),
    documentSchema.nodes.heading,
    () => ({ level }),
  );
}
