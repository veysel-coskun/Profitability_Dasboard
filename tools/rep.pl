# Exact-text replace for source files: perl tools/rep.pl FILE < edits, where edits are blocks
#   @@OLD\n<old text>\n@@NEW\n<new text>\n@@END   (each OLD must occur exactly once). CRLF in the file or the edits is normalised to LF.
use strict; use warnings; my $f=shift or die "usage: rep.pl FILE < edits"; local $/;
my $e=<STDIN>; $e=~s/\r\n/\n/g; open my $h,'<:raw',$f or die "$f: $!"; my $s=<$h>; close $h; $s=~s/\r\n/\n/g; my $n=0;
while($e=~/\@\@OLD\n(.*?)\n\@\@NEW\n(.*?)\n?\@\@END/sg){ my($o,$r)=($1,$2); my $i=index($s,$o);
  die "$f: not found:\n$o\n" if $i<0; die "$f: not unique:\n$o\n" if index($s,$o,$i+1)>=0; substr($s,$i,length $o)=$r; $n++; }
open $h,'>:raw',$f or die; print $h $s; close $h; print "$f: $n edit(s)\n";
