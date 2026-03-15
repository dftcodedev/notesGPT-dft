'use client';

import { LogOut, Paintbrush2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export function UserNav({
  image,
  name,
  email,
}: {
  image: string;
  name: string;
  email: string;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            {image ? (
              <Image src={image} fill alt="profile picture" sizes="10rem" />
            ) : (
              <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-black">
              {name}
            </p>
            <p className="text-xs leading-none text-black">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/dashboard">
          <DropdownMenuItem className="hover:cursor-pointer hover:bg-gray-200">
            <Paintbrush2 className="mr-2 h-4 w-4 text-black" />
            <span className="text-black">Dashboard</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="hover:cursor-pointer hover:bg-gray-200"
        >
          <LogOut className="mr-2 h-4 w-4 text-black" />
          <span className="text-black">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
