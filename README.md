# @quartz-community/darkmode

Adds a dark mode toggle button that switches between light and dark themes.

## Installation

```bash
npx quartz plugin add @quartz-community/darkmode
```

It is already included (and enabled) in the default `quartz.config.yaml`.

## Usage

```yaml title="quartz.config.yaml"
plugins:
  - source: "@quartz-community/darkmode"
    enabled: true
    layout:
      position: left
      priority: 30
      group: toolbar
```

## Configuration

This plugin has no configuration options. To remove the toggle, set `enabled: false` on its entry.

## Documentation

See the [Quartz documentation](https://quartz.jzhao.xyz/features/darkmode) for more information.

## License

MIT
