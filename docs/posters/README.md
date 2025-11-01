# VaultMesh Architect Posters

This directory is intended to contain high-resolution visual materials for presentations, documentation, and marketing.

## Planned Content

### Architecture Posters
High-level visual representations of the VaultMesh Architect system:
- System architecture overview
- Data flow diagrams
- Security model visualizations
- Governance workflow illustrations

### Format Guidelines

When adding posters:

**Formats:**
- PDF (vector, preferred for printing)
- PNG (high-res, min 300 DPI for presentations)
- SVG (web-friendly vector format)

**Naming Convention:**
```
vaultmesh-[topic]-[version].[ext]
Example: vaultmesh-architecture-overview-v1.0.pdf
```

**Size Guidelines:**
- Presentation slides: 1920x1080 (16:9) or 1600x1200 (4:3)
- Posters: A4 (2480x3508 at 300 DPI) or Letter (2550x3300 at 300 DPI)
- Web thumbnails: 800x600 or 1200x800

## Creating Posters

### From Mermaid Diagrams

Start with diagrams from `../diagrams/` and enhance:

```bash
# Render Mermaid to high-res PNG
mmdc -i ../diagrams/architecture-overview.mermaid \
     -o architecture-overview-base.png \
     -b transparent \
     -w 3000

# Then enhance in design tool (Inkscape, Figma, etc.)
```

### Design Tools

Recommended tools:
- **Inkscape** - Free, open-source vector editor
- **Figma** - Collaborative design (web-based)
- **Draw.io** - Simple diagramming tool
- **Canva** - Template-based design

### Branding

Visual identity elements:
- **Colors:** (TBD - define brand colors)
- **Fonts:** Clear, readable fonts for technical content
- **Logo:** VaultMesh logo (when available)
- **Style:** Clean, professional, security-focused aesthetic

## Publishing Posters

### For Documentation
Link from main documentation:
```markdown
![Architecture Overview](docs/posters/vaultmesh-architecture-overview.png)
```

### For Presentations
Include in:
- Conference talks
- Webinars
- Technical workshops
- Client presentations

### For Social Media
Create web-optimized versions:
```bash
# Optimize PNG for web
convert poster.png -resize 1200x1200\> -quality 85 poster-web.png
```

## File Size Management

Keep repository lean:
- ✅ Use vector formats (PDF, SVG) when possible
- ✅ Optimize raster images before committing
- ✅ Consider Git LFS for very large files (>5MB)
- ❌ Avoid committing working files (`.psd`, `.ai`, `.xcf`)

### Optimization Commands

```bash
# Optimize PNG
pngquant --quality=80-95 poster.png

# Optimize PDF
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH -sOutputFile=poster-optimized.pdf poster.pdf
```

## License & Attribution

All posters in this directory are licensed under the same terms as the project (ISC License).

When using posters externally:
- Attribute to VaultSovereign / VaultMesh project
- Link back to GitHub repository
- Maintain any copyright notices

## Contributing

To contribute posters:

1. Review the [Contributing Guide](../../CONTRIBUTING.md)
2. Ensure posters are professional quality
3. Follow naming conventions
4. Optimize file sizes
5. Update this README with poster descriptions
6. Submit a pull request

### Quality Checklist

- [ ] High resolution (min 300 DPI for print)
- [ ] Clear, readable text
- [ ] Proper color contrast
- [ ] No proprietary/internal information
- [ ] Optimized file size
- [ ] Proper attribution
- [ ] Descriptive filename

## Examples

_(Posters will be added here as they are created)_

### Coming Soon

- VaultMesh Architecture Overview Poster
- LAWCHAIN Governance Flow Poster
- Multi-Chain Anchoring Visualization
- Phoenix Resilience Protocol Poster

## Questions?

For questions about poster design or contributions, see:
- [GitHub Discussions](https://github.com/VaultSovereign/vaultmesh-architect-mcp/discussions)
- [Contributing Guide](../../CONTRIBUTING.md)
