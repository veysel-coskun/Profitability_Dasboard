#!/usr/bin/perl
# Build dist/profitability_cockpit.html from manifest.txt (run from the _Cockpit_Public folder: perl build.pl).
# In [js], files between "@wrap" and "@endwrap" are wrapped in function __app(){…} so the app can be restarted on a new data pack.
use strict; use warnings;
my %sec=(head=>[],css=>[],html=>[],js=>[]); my $cur;
open my $m,'<','manifest.txt' or die "manifest.txt: $!";
while(<$m>){ s/\r?\n$//; next if /^\s*(#|$)/; if(/^\[(\w+)\]$/){ $cur=$1; die "bad section $1" unless $sec{$cur}; next } push @{$sec{$cur}},$_ }
sub slurp{ my $f=shift; return "function __app(){\n" if $f eq '@wrap'; return "}\n" if $f eq '@endwrap'; open my $h,'<:raw',$f or die "$f: $!"; local $/; my $s=<$h>; $s.="\n" unless $s=~/\n\z/; $s }
my $out=join('',map{slurp($_)}@{$sec{head}})."<style>\n".join('',map{slurp($_)}@{$sec{css}})."</style>\n\n"
  .join('',map{slurp($_)}@{$sec{html}})."<script>\n".join('',map{slurp($_)}@{$sec{js}})."</script>\n";
my $dst=$ARGV[0]||'dist/profitability_cockpit.html'; open my $o,'>:raw',$dst or die "$dst: $!"; print $o $out; close $o;
printf "built %s  %.2f MB  (%d files)\n",$dst,length($out)/1048576,scalar(grep{!/^@/}map{@$_}values %sec);
