# Change Date Script

An interactive node script to change the Modified Date (mtime) of files.

# Usage Example

If the current working directory contains a file named `file-to-change-date.txt` with the modified date of `2021/02/21 20:54:54` and we want to change it to `1999/01/01 12:12:12`, we should issue the following interactive command:

```s
> node index.js file-to-change-date.txt
File: stdin.js
Date (yyyy/mm/dd) [2021/02/21]: 1999/01/01
Time ( hh:mm:dd ) [ 20:54:54 ]: 12:12:12
File date time changed to 1999/01/01 12:12:12
```

# Context Menu

There are two register files in the `context-menu` folder that you can add to your computer to have the `Modify Date Script` show up when you right click a file.