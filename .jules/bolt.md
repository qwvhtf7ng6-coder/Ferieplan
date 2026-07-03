## 2024-05-19 - Fast Date Parsing
**Learning:** Instantiating `new Date(string).toISOString().slice(0, 10)` in loops and useMemo hooks is very slow compared to basic string splitting/slicing `string.substring(0, 10)` because it allocates memory for Date objects, parses the string format, handles timezone conversions, and stringifies it again just to extract a prefix.
**Action:** Use a fast utility `toISODate(date)` that returns `date.substring(0, 10)` if the input is already a string, circumventing unnecessary date class instantiations.
