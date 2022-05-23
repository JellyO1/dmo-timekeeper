# DMO Timekeeper

This bot can be used to get the next time of a certain world boss on Digimon Masters Online.  
Since the discord API doesn't provide any way to know the user timezone this bot uses UTC and allows you to set your offset.

# Commands

## set_zone
Sets your UTC offset, this can be between -12 and 14.

    /set_zone [offset]
    /set_zone 1
    /set_zone -11

## tour

Retrieves the next Myotismon tour time.

    /tour [server]

## set_tour

There is two ways to set when the tour next or last time.  
The first sets the last tour time in the **server** to the current time.

    /set_tour [server]

 Sets the next or last tour time to **time** in the **server**

    /set_tour [server] [time(hh:mm)]

## notify

This command enables the notifications for the channel where it is called.  
It takes the **server** and **monster** on which to notify.

    /notify [server] [monster]