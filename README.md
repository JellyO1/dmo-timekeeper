# DMO Timekeeper

This bot can be used to get the next time of a certain world boss on Digimon Masters Online.
Since the discord API doesn't provide any way to know the user timezone this bot uses UTC and allows you to set your offset.

## Commands

### Setting your timezone

/set_zone <offset>: Sets your UTC offset, this can be between -12 and 14

Examples:

/set_zone 1 - Sets your timezone to UTC+1;
/set_zone -11 - Sets your timezone to UTC-11;

### Getting the next Tour time

/tour <server> - Retrieves the next Myotismon tour starting time.

### Setting the Tour time

There is two ways to set when the tour next or last time.

/set_tour <server> - Sets the last tour time in the <server> to the current time.
/set_tour <server> <time(hh:mm)> - Sets the next or last tour time to <time> in the <server>.