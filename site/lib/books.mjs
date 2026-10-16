// Book of Mormon book order, URL slugs and display names. Other works can be
// added with the same shape (see WORKS) without changing any template.
export const BOOKS = [
  ['1 Nephi', '1-nephi'], ['2 Nephi', '2-nephi'], ['Jacob', 'jacob'], ['Enos', 'enos'],
  ['Jarom', 'jarom'], ['Omni', 'omni'], ['Words of Mormon', 'words-of-mormon'], ['Mosiah', 'mosiah'],
  ['Alma', 'alma'], ['Helaman', 'helaman'], ['3 Nephi', '3-nephi'], ['4 Nephi', '4-nephi'],
  ['Mormon', 'mormon'], ['Ether', 'ether'], ['Moroni', 'moroni'],
].map(([name, slug]) => ({ name, slug }));

export const WORKS = {
  'book-of-mormon': { slug: 'book-of-mormon', name: 'Book of Mormon', corpusKey: 'BOM', books: BOOKS, content: 'book-of-mormon.json' },
};

export const BOOK_BY_NAME = new Map(BOOKS.map(b => [b.name, b]));
export const BOOK_BY_SLUG = new Map(BOOKS.map(b => [b.slug, b]));
