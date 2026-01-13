# Subtitle to DOCX Converter

A fast, privacy-focused web tool that converts subtitle files (.SRT and .VTT) into Microsoft Word documents (.docx).

## Features

### Three Export Formats

1. **Word Count (Text Only)** - Extract and count words from subtitles
   - Merges subtitle cues into readable paragraphs
   - Displays word count per file and total
   - Perfect for transcription analysis

2. **Translator Package** - Create translation-ready documents
   - Table format with source text and empty translation columns
   - Optional speaker names and timestamps
   - Ideal for professional subtitle translation work

3. **Archive** - Combine original subtitle files
   - Preserves original formatting
   - All files in a single .docx document
   - Useful for backup and sharing

### Customizable Options

- **Paragraph Gap Threshold**: Control how subtitle cues are merged into paragraphs based on timing
- **Keep Speaker Names**: Extract and preserve speaker tags (format: `- [Name]`)
- **Remove Bracketed Text**: Filter out music notation and stage directions
- **Include Timestamps**: Optionally add timestamps to translator package exports

### Privacy First

- **100% Local Processing**: All file processing happens in your browser
- **No Server Upload**: Your files never leave your device
- **No Data Storage**: Nothing is saved or tracked

### Modern Design

- **Dark/Light/Auto Theme**: Matches your system preferences or manual selection
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Typewriter Aesthetic**: Retro monospace design with modern functionality

## Supported Formats

- `.srt` - SubRip subtitle files
- `.vtt` - WebVTT subtitle files

## Usage

1. **Upload Files**: Click "SELECT .SRT / .VTT FILES" and choose one or multiple subtitle files
2. **Configure Options**: Adjust paragraph gap, speaker settings, and other preferences
3. **Export**: Click one of the three export buttons to generate your .docx file

## Development

This project is built with:

- **React 19** - Modern UI framework
- **TypeScript** - Type-safe code
- **Vite** - Fast development and build tool
- **docx** - Word document generation
- **srt-parser-2** - SRT file parsing

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Project Structure

```
src/
├── App.tsx              # Main application component
├── App.css              # Styling and theming
├── lib/
│   ├── parseSrt.ts     # SRT file parser
│   ├── parseVtt.ts     # VTT file parser
│   ├── toDocx.ts       # Word document generation
│   └── utils.ts        # Shared utility functions
```

## Browser Compatibility

Works in all modern browsers that support:
- File API
- ES2020+ JavaScript features
- Web Workers (optional, for future optimization)

## Deployment

This project is configured for GitHub Pages deployment:

```bash
npm run build
# Outputs to docs/ folder
# Push to GitHub and enable Pages from docs/ folder
```

## License

This project is open source and available for use and modification.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Technical Details

### Speaker Tag Format

Speaker names are extracted from subtitle lines that start with:
```
- [Speaker Name]
```

### Time Format Support

Both comma and period separators are supported:
- `00:00:01,000` (SRT format)
- `00:00:01.000` (VTT format)

### Paragraph Merging

Subtitles are merged into paragraphs when:
1. The time gap between cues is less than the threshold (default: 2.5 seconds)
2. The previous cue doesn't end with sentence-ending punctuation (`.`, `?`, `!`, `…`)

## Troubleshooting

### File Won't Parse
- Ensure file is in .srt or .vtt format
- Check that file encoding is UTF-8
- Verify file isn't corrupted

### Export Fails
- Check browser console for specific error messages
- Try with a smaller file first
- Ensure browser has enough memory available

### Styling Issues
- Try clearing browser cache
- Check if browser is up to date
- Test in different browser

## Future Enhancements

Potential features for future releases:
- Code splitting for smaller initial bundle
- Web Workers for large file processing
- Additional export formats (PDF, plain text)
- Batch processing improvements
- More customization options
